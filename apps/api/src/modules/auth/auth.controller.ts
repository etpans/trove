import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService, type AuthenticatedUser } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { RefreshDto } from './dto/refresh.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationCodeDto } from './dto/resend-verification-code.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResendPasswordResetCodeDto } from './dto/resend-password-reset-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthGuard } from '@nestjs/passport';
import { TurnstileGuard } from './strategies/turnstile.guard';

type LocalAuthRequest = {
  user: AuthenticatedUser;
};

type JwtAuthRequest = {
  user: {
    userId: string;
    email: string;
  };
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @UseGuards(TurnstileGuard)
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @UseGuards(TurnstileGuard, AuthGuard('local'))
  @Post('login')
  login(@Request() req: LocalAuthRequest) {
    return this.authService.login(req.user);
  }

  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.email, dto.code);
  }

  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Post('resend-verification-code')
  resendVerificationCode(@Body() dto: ResendVerificationCodeDto) {
    return this.authService.resendVerificationCode(dto.email);
  }

  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Post('resend-password-reset-code')
  resendPasswordResetCode(@Body() dto: ResendPasswordResetCodeDto) {
    return this.authService.resendPasswordResetCode(dto.email);
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refreshTokens(dto.refresh_token);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  logout(@Body() dto: RefreshDto) {
    return this.authService.logout(dto.refresh_token);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Request() req: JwtAuthRequest) {
    return req.user;
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('account')
  deleteAccount(@Request() req: JwtAuthRequest) {
    return this.authService.deleteAccount(req.user.userId);
  }
}
