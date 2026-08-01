import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { RegisterDto } from './dto/register.dto';
import { EmailService } from './email.service';
import { RefreshToken } from './refresh-token.entity';

const hash = (val: string) =>
  crypto.createHash('sha256').update(val).digest('hex');

const verificationLinkTtlMs = 24 * 60 * 60 * 1000;
const verificationResendCooldownSeconds = 60;
const expiredAccountCleanupIntervalMs = 60 * 1000;

export type AuthenticatedUser = {
  email: string;
  id: string;
};

@Injectable()
export class AuthService implements OnModuleInit, OnModuleDestroy {
  private cleanupTimer?: NodeJS.Timeout;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,

    @InjectRepository(RefreshToken)
    private readonly rtRepository: Repository<RefreshToken>,
  ) {}

  onModuleInit() {
    void this.deleteExpiredUnverifiedUsers();
    this.cleanupTimer = setInterval(() => {
      void this.deleteExpiredUnverifiedUsers();
    }, expiredAccountCleanupIntervalMs);
  }

  onModuleDestroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    const displayName = dto.displayName.trim();
    const existingUser = await this.userRepository.findOne({
      where: { email },
      select: {
        id: true,
        email: true,
        isVerified: true,
        verificationExpiry: true,
      },
    });

    if (existingUser) {
      if (existingUser.isVerified) {
        throw new ConflictException('Email already in use');
      }

      if (this.isVerificationExpired(existingUser)) {
        await this.userRepository.delete({ id: existingUser.id });
      } else {
        throw new ConflictException(
          'Email already registered. Check your email or resend the verification link.',
        );
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const verification = this.createVerificationToken();

    const user = await this.userRepository.save({
      email,
      displayName,
      password: passwordHash,
      verificationToken: verification.tokenHash,
      verificationExpiry: verification.expiresAt,
      lastVerificationEmailSentAt: new Date(),
    });

    await this.emailService.sendVerificationEmail(
      user.email,
      verification.rawToken,
    );
    return { message: 'Check your email to verify your account.' };
  }

  async verifyEmail(token: string) {
    const user = await this.userRepository.findOneBy({
      verificationToken: hash(token),
    });

    if (!user) throw new BadRequestException('Invalid or expired token');
    if (this.isVerificationExpired(user)) {
      await this.userRepository.delete({ id: user.id });
      throw new BadRequestException(
        'Verification link expired. Your unverified account has been deleted. Please sign up again.',
      );
    }

    user.isVerified = true;
    user.verificationToken = null;
    user.verificationExpiry = null;
    user.lastVerificationEmailSentAt = null;
    await this.userRepository.save(user);
    return { message: 'Email verified.' };
  }

  async resendVerificationEmail(email: string) {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase().trim() },
      select: {
        email: true,
        id: true,
        isVerified: true,
        lastVerificationEmailSentAt: true,
        verificationExpiry: true,
      },
    });

    if (!user) {
      throw new BadRequestException('No unverified account found.');
    }

    if (user.isVerified) {
      throw new BadRequestException('This email is already verified.');
    }

    if (this.isVerificationExpired(user)) {
      await this.userRepository.delete({ id: user.id });
      throw new BadRequestException(
        'Verification link expired. Your unverified account has been deleted. Please sign up again.',
      );
    }

    const secondsUntilResend = this.getSecondsUntilResendAllowed(user);

    if (secondsUntilResend > 0) {
      throw new HttpException(
        {
          cooldownSeconds: secondsUntilResend,
          message: `Please wait ${secondsUntilResend} seconds before resending the verification email.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const verification = this.createVerificationToken();
    user.verificationToken = verification.tokenHash;
    user.verificationExpiry = verification.expiresAt;
    user.lastVerificationEmailSentAt = new Date();
    await this.userRepository.save(user);
    await this.emailService.sendVerificationEmail(user.email, verification.rawToken);

    return {
      cooldownSeconds: verificationResendCooldownSeconds,
      message: 'Verification email sent.',
    };
  }

  // TODO: think about what if the user has multiple devices or somehow logins again
  async validateUser(
    email: string,
    password: string,
  ): Promise<AuthenticatedUser> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        failedLoginAttempts: true,
        password: true,
        isVerified: true,
        lockedUntil: true,
        verificationExpiry: true,
      },
    });
    if (!user) throw new UnauthorizedException();

    if (user.lockedUntil && user.lockedUntil > new Date())
      throw new ForbiddenException('Account locked. Try again later.');

    if (!user.isVerified && this.isVerificationExpired(user)) {
      await this.userRepository.delete({ id: user.id });
      throw new ForbiddenException(
        'Verification link expired. Your unverified account has been deleted. Please sign up again.',
      );
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await this.userRepository.save(user);
      throw new UnauthorizedException('Invalid credentials');
    }

    // if valid credentials reset values:
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await this.userRepository.save(user);

    if (!user.isVerified)
      throw new ForbiddenException('Please verify your email first.');

    return { email: user.email, id: user.id };
  }

  async login(user: AuthenticatedUser) {
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });

    const rawRefresh = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.rtRepository.save({
      tokenHash: hash(rawRefresh),
      userId: user.id,
      expiresAt,
    });

    return { access_token: accessToken, refresh_token: rawRefresh };
  }

  async refreshTokens(rawRefreshToken: string) {
    const rt = await this.rtRepository
      .createQueryBuilder('rt')
      .addSelect('rt.tokenHash')
      .where('rt.tokenHash = :h', { h: hash(rawRefreshToken) })
      .getOne();

    if (!rt || rt.isRevoked || rt.expiresAt < new Date())
      throw new UnauthorizedException('Invalid refresh token');

    rt.isRevoked = true;
    await this.rtRepository.save(rt);

    const user = await this.userRepository.findOneBy({ id: rt.userId });
    if (!user) throw new UnauthorizedException('Invalid refresh token');

    return this.login(user);
  }

  async logout(rawRefreshToken: string) {
    const rt = await this.rtRepository
      .createQueryBuilder('rt')
      .addSelect('rt.tokenHash')
      .where('rt.tokenHash = :h', { h: hash(rawRefreshToken) })
      .getOne();

    if (rt) {
      rt.isRevoked = true;
      await this.rtRepository.save(rt);
    }
    return { message: 'Logged out.' };
  }

  private createVerificationToken() {
    const rawToken = uuidv4();

    return {
      expiresAt: new Date(Date.now() + verificationLinkTtlMs),
      rawToken,
      tokenHash: hash(rawToken),
    };
  }

  private async deleteExpiredUnverifiedUsers() {
    await this.userRepository
      .createQueryBuilder()
      .delete()
      .where('"isVerified" = :isVerified', { isVerified: false })
      .andWhere('"verificationExpiry" IS NOT NULL')
      .andWhere('"verificationExpiry" < :now', { now: new Date() })
      .execute();
  }

  private getSecondsUntilResendAllowed(user: User) {
    if (!user.lastVerificationEmailSentAt) {
      return 0;
    }

    const elapsedSeconds = Math.floor(
      (Date.now() - user.lastVerificationEmailSentAt.getTime()) / 1000,
    );

    return Math.max(verificationResendCooldownSeconds - elapsedSeconds, 0);
  }

  private isVerificationExpired(user: Pick<User, 'verificationExpiry'>) {
    return !user.verificationExpiry || user.verificationExpiry < new Date();
  }
}
