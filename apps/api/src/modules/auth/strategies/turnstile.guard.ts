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
};

@Injectable()
export class TurnstileGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // const request = context.switchToHttp().getRequest<TurnstileRequest>();
    // const token = request.body?.['cf-turnstile-response'];
    //
    // if (typeof token !== 'string')
    //   throw new BadRequestException('Missing Turnstile token');
    //
    // const res = await fetch(
    //   // TODO: sign up for turnstile
    //   'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    //   {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({
    //       secret: this.config.get<string>('TURNSTILE_SECRET'),
    //       response: token,
    //       remoteip: request.ip,
    //     }),
    //   },
    // );
    //
    // const data = (await res.json()) as TurnstileResponse;
    // if (!data.success)
    //   throw new BadRequestException('Turnstile verification failed');

    return true;
  }
}
