import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');

    if (!apiKey) {
      throw new InternalServerErrorException('RESEND_API_KEY is not configured');
    }

    this.resend = new Resend(apiKey);
    this.from =
      this.config.get<string>('RESEND_FROM') ?? 'onboarding@resend.dev';
  }

  async sendVerificationCode(to: string, code: string): Promise<void> {
    await this.sendEmail({
      html: `
        <p>Thanks for signing up. Enter this code to verify your email:</p>
        <p style="font-size: 24px; font-weight: 700; letter-spacing: 6px;">${code}</p>
        <p>This code expires in 10 minutes.</p>
      `,
      subject: 'Verify your trove email',
      text: [
        'Welcome to trove.',
        '',
        'Enter this code to verify your email address:',
        code,
        '',
        'This code expires in 10 minutes.',
      ].join('\n'),
      to,
    });
  }

  async sendPasswordResetCode(to: string, code: string): Promise<void> {
    await this.sendEmail({
      html: `
        <p>Enter this code to reset your password:</p>
        <p style="font-size: 24px; font-weight: 700; letter-spacing: 6px;">${code}</p>
        <p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>
      `,
      subject: 'Reset your password',
      text: [
        'Enter this code to reset your password:',
        code,
        '',
        'This code expires in 10 minutes. If you did not request it, you can ignore this email.',
      ].join('\n'),
      to,
    });
  }

  private async sendEmail({
    html,
    subject,
    text,
    to,
  }: {
    html: string;
    subject: string;
    text: string;
    to: string;
  }) {
    const { error } = await this.resend.emails.send({
      from: this.from,
      html,
      subject,
      text,
      to,
    });

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
