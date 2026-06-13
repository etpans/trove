import { Injectable, ConflictException, UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { RegisterDto } from './dto/register.dto';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';
import { RefreshToken } from './refresh-token.entity';

const hash = (val: string) =>
  crypto.createHash('sha256').update(val).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,

    @InjectRepository(RefreshToken)
    private readonly rtRepository: Repository<RefreshToken>,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.userRepository.existsBy({ email: dto.email });
    if (exists) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const rawToken = uuidv4();
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours -> milliseconds

    const user = await this.userRepository.save({
      email: dto.email,
      displayName: dto.displayName,
      password: passwordHash,
      verificationToken: hash(rawToken),
      verificationExpiry: expiry,
    });

    await this.emailService.sendVerificationEmail(user.email, rawToken);
    return { message: 'Check your email to verify your account.' };
  }

  async verifyEmail(token: string) {
    const user = await this.userRepository.findOneBy({ verificationToken: hash(token) });

    // TODO: add something to indicate user is already verified if they request again
    if (!user) throw new BadRequestException('Invalid or expired token');
    if (!user.verificationExpiry || user.verificationExpiry < new Date())
      throw new BadRequestException('Token expired');

    user.isVerified = true;
    // TODO: fix the cleanup for the uneeded values so then above checks prevent user from continualy verificed
    user.verificationToken = undefined;
    user.verificationExpiry = undefined;
    await this.userRepository.save(user);
    return { message: 'Email verified.' };
  }

  // TODO: think about what if the user has multiple devices or somehow logins again
  async validateUser(email: string, password: string) {
    const user = await this.userRepository.findOne({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        isVerified: true,
      },
    });
    if (!user) throw new UnauthorizedException();

    if (user.lockedUntil && user.lockedUntil > new Date())
      throw new ForbiddenException('Account locked. Try again later.');

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
    user.lockedUntil = undefined;
    await this.userRepository.save(user);

    if (!user.isVerified)
      throw new ForbiddenException('Please verify your email first.');

    const { password: _, ...result } = user as any;
    return result;
  }

  async login(user: any) {
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
}
