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
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { User } from './user.entity';
import { RegisterDto } from './dto/register.dto';
import { EmailService } from './email.service';
import { RefreshToken } from './refresh-token.entity';
import { ResetPasswordDto } from './dto/reset-password.dto';

const hash = (val: string) =>
  crypto.createHash('sha256').update(val).digest('hex');

const CODE_EXPIRY_MS = 10 * 60 * 1000;
const CODE_RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;
const EXPIRED_ACCOUNT_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

export type AuthenticatedUser = {
  id: string;
  email: string;
};

const createCode = () =>
  crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');

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
    }, EXPIRED_ACCOUNT_CLEANUP_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  async register(dto: RegisterDto) {
    const exists = await this.userRepository.existsBy({ email: dto.email });
    if (exists) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const code = createCode();
    const now = new Date();

    const user = await this.userRepository.save({
      email: dto.email,
      displayName: dto.displayName,
      password: passwordHash,
      verificationCodeHash: hash(code),
      verificationCodeExpiry: new Date(now.getTime() + CODE_EXPIRY_MS),
      verificationCodeSentAt: now,
      verificationCodeAttempts: 0,
    });

    await this.emailService.sendVerificationCode(user.email, code);
    return { message: 'Check your email for a verification code.' };
  }

  async verifyEmail(email: string, code: string) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.verificationCodeHash')
      .where('user.email = :email', { email })
      .getOne();

    if (!user) throw new BadRequestException('Invalid or expired code');
    if (user.isVerified) return { message: 'Email already verified.' };
    if (!user.verificationCodeHash || !user.verificationCodeExpiry)
      throw new BadRequestException('Invalid or expired code');
    if (user.verificationCodeExpiry < new Date())
      throw new BadRequestException('Code expired');
    if (user.verificationCodeAttempts >= MAX_CODE_ATTEMPTS)
      throw new BadRequestException('Too many attempts. Request a new code.');
    if (user.verificationCodeHash !== hash(code)) {
      user.verificationCodeAttempts += 1;
      await this.userRepository.save(user);
      throw new BadRequestException('Invalid or expired code');
    }

    user.isVerified = true;
    user.verificationCodeHash = null;
    user.verificationCodeExpiry = null;
    user.verificationCodeSentAt = null;
    user.verificationCodeAttempts = 0;
    await this.userRepository.save(user);
    return { message: 'Email verified.' };
  }

  async resendVerificationCode(email: string) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.verificationCodeHash')
      .where('user.email = :email', { email })
      .getOne();

    if (!user || user.isVerified) {
      return {
        message: 'If the account needs verification, a new code will be sent.',
      };
    }

    this.assertCanResend(user.verificationCodeSentAt);

    const code = createCode();
    const now = new Date();
    user.verificationCodeHash = hash(code);
    user.verificationCodeExpiry = new Date(now.getTime() + CODE_EXPIRY_MS);
    user.verificationCodeSentAt = now;
    user.verificationCodeAttempts = 0;
    await this.userRepository.save(user);
    await this.emailService.sendVerificationCode(user.email, code);

    return {
      message: 'If the account needs verification, a new code will be sent.',
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
        verificationCodeExpiry: true,
        lockedUntil: true,
      },
    });
    if (!user) throw new UnauthorizedException();

    if (user.lockedUntil && user.lockedUntil > new Date())
      throw new ForbiddenException('Account locked. Try again later.');

    if (!user.isVerified && this.isVerificationExpired(user)) {
      await this.userRepository.delete({ id: user.id });
      throw new ForbiddenException(
        'Verification code expired. Your unverified account has been deleted. Please sign up again.',
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

    const rawRefresh = crypto.randomUUID();
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

  async forgotPassword(email: string) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordResetCodeHash')
      .where('user.email = :email', { email })
      .getOne();

    if (!user) {
      return {
        message: 'If an account exists, a password reset code will be sent.',
      };
    }

    await this.sendPasswordResetCode(user);
    return {
      message: 'If an account exists, a password reset code will be sent.',
    };
  }

  async resendPasswordResetCode(email: string) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordResetCodeHash')
      .where('user.email = :email', { email })
      .getOne();

    if (!user) {
      return {
        message: 'If an account exists, a password reset code will be sent.',
      };
    }

    await this.sendPasswordResetCode(user);
    return {
      message: 'If an account exists, a password reset code will be sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordResetCodeHash')
      .where('user.email = :email', { email: dto.email })
      .getOne();

    if (!user || !user.passwordResetCodeHash || !user.passwordResetCodeExpiry)
      throw new BadRequestException('Invalid or expired code');
    if (user.passwordResetCodeExpiry < new Date())
      throw new BadRequestException('Code expired');
    if (user.passwordResetCodeAttempts >= MAX_CODE_ATTEMPTS)
      throw new BadRequestException('Too many attempts. Request a new code.');
    if (user.passwordResetCodeHash !== hash(dto.code)) {
      user.passwordResetCodeAttempts += 1;
      await this.userRepository.save(user);
      throw new BadRequestException('Invalid or expired code');
    }

    user.password = await bcrypt.hash(dto.password, 10);
    user.passwordResetCodeHash = null;
    user.passwordResetCodeExpiry = null;
    user.passwordResetCodeSentAt = null;
    user.passwordResetCodeAttempts = 0;
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await this.userRepository.save(user);
    await this.rtRepository.update(
      { userId: user.id, isRevoked: false },
      { isRevoked: true },
    );

    return { message: 'Password reset.' };
  }

  private async sendPasswordResetCode(user: User) {
    this.assertCanResend(user.passwordResetCodeSentAt);

    const code = createCode();
    const now = new Date();
    user.passwordResetCodeHash = hash(code);
    user.passwordResetCodeExpiry = new Date(now.getTime() + CODE_EXPIRY_MS);
    user.passwordResetCodeSentAt = now;
    user.passwordResetCodeAttempts = 0;
    await this.userRepository.save(user);
    await this.emailService.sendPasswordResetCode(user.email, code);
  }

  private assertCanResend(sentAt?: Date | null) {
    if (!sentAt) return;

    const retryAt = sentAt.getTime() + CODE_RESEND_COOLDOWN_MS;
    if (retryAt > Date.now()) {
      const seconds = Math.ceil((retryAt - Date.now()) / 1000);
      throw new HttpException(
        `Please wait ${seconds}s before requesting another code.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private isVerificationExpired(user: User) {
    return Boolean(
      user.verificationCodeExpiry && user.verificationCodeExpiry < new Date(),
    );
  }

  private async deleteExpiredUnverifiedUsers() {
    await this.userRepository.delete({
      isVerified: false,
      verificationCodeExpiry: LessThan(new Date()),
    });
  }
}
