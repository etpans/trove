import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get('SMTP_HOST'),
      port: config.get<number>('SMTP_PORT'),
      auth: {
        user: config.get('SMTP_USER'),
        pass: config.get('SMTP_PASS'),
      },
      connectionTimeout: 500, // 5s
      greetingTimeout: 500,
      socketTimeout: 500,
    });
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const url = `${this.config.get('FRONTEND_URL')}/verify-email?token=${token}`;
    await this.transporter.sendMail({
      from: this.config.get('SMTP_FROM'),
      to,
      subject: 'Verify your email address',
      html: `
        <p>Thanks for signing up. Click the link below to verify your email.</p>
        <a href="${url}">Verify email</a>
        <p>This link expires in 24 hours.</p>
      `,
    });
  }
}
