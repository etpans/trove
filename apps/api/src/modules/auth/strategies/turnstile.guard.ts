import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type TurnstileRequest = {
  body?: Record<string, unknown>;
  ip?: string;
};

type TurnstileResponse = {
  success?: boolean;
  'error-codes'?: string[];
};

@Injectable()
export class TurnstileGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.shouldBypass()) {
      return true;
    }

    const request = context.switchToHttp().getRequest<TurnstileRequest>();
    const token =
      request.body?.['cf-turnstile-response'] ?? request.body?.turnstileToken;

    if (typeof token !== 'string' || token.trim().length === 0) {
      throw new BadRequestException('Missing Turnstile token');
    }

    const secret = this.config.get<string>('TURNSTILE_SECRET');
    if (!secret) {
      throw new BadRequestException('Turnstile is not configured');
    }

    const body = new URLSearchParams({
      secret,
      response: token,
    });

    if (request.ip) {
      body.set('remoteip', request.ip);
    }

    const res = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      },
    );

    if (!res.ok) {
      throw new BadRequestException('Turnstile verification failed');
    }

    const data = (await res.json()) as TurnstileResponse;
    if (!data.success) {
      throw new BadRequestException('Turnstile verification failed');
    }

    return true;
  }

  private shouldBypass() {
    const nodeEnv = this.config.get<string>('NODE_ENV');
    const bypass = this.config.get<string>('TURNSTILE_BYPASS');

    return (
      nodeEnv === 'test' ||
      ['1', 'true', 'yes'].includes((bypass ?? '').toLowerCase())
    );
  }
}
