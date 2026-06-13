import { Injectable, CanActivate, ExecutionContext, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TurnstileGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.body['cf-turnstile-response'];

    if (!token) throw new BadRequestException('Missing Turnstile token');

    const res = await fetch(
      // TODO: sign up for turnstile
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: this.config.get('TURNSTILE_SECRET'),
          response: token,
          remoteip: request.ip,
        }),
      },
    );

    const data = await res.json();
    if (!data.success)
      throw new BadRequestException('Turnstile verification failed');

    return true;
  }
}
