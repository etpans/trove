import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get('SMTP_HOST'),
      port: Number(config.get('SMTP_PORT')),
      auth: {
        user: config.get('SMTP_USER'),
        pass: config.get('SMTP_PASS'),
      },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
    });
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const configuredFrontendUrl = this.config.get<string>('FRONTEND_URL');
    const apiPort = String(this.config.get<number>('PORT') ?? 3000);
    let frontendUrl = configuredFrontendUrl ?? 'http://localhost:3001';

    if (frontendUrl === `http://localhost:${apiPort}`) {
      frontendUrl = 'http://localhost:3001';
    }

    const url = `${frontendUrl}/verify-email?token=${token}`;

    await this.transporter.sendMail({
      from:
        this.config.get<string>('SMTP_FROM') ?? 'trove <no-reply@trove.app>',
      to,
      subject: 'Verify your trove email',
      text: [
        'Welcome to trove.',
        '',
        'Verify your email address to finish creating your account:',
        url,
        '',
        'This link expires in 24 hours.',
      ].join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; color: #111111; line-height: 1.6;">
          <h1 style="font-size: 24px; margin: 0 0 12px;">Welcome to trove</h1>
          <p>Verify your email address to finish creating your account.</p>
          <p>
            <a href="${url}" style="display: inline-block; border-radius: 10px; background: #378ADD; color: #ffffff; padding: 12px 18px; text-decoration: none;">
              Verify email
            </a>
          </p>
          <p style="color: #5f5f5f;">This link expires in 24 hours.</p>
        </div>
      `,
    });
  }
}
