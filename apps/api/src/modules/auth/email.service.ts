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

  async sendVerificationCode(to: string, code: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.get('SMTP_FROM'),
      to,
      subject: 'Verify your email address',
      html: `
        <p>Thanks for signing up. Enter this code to verify your email:</p>
        <p style="font-size: 24px; font-weight: 700; letter-spacing: 6px;">${code}</p>
        <p>This code expires in 10 minutes.</p>
      `,
    });
  }

  async sendPasswordResetCode(to: string, code: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.get('SMTP_FROM'),
      to,
      subject: 'Reset your password',
      html: `
        <p>Enter this code to reset your password:</p>
        <p style="font-size: 24px; font-weight: 700; letter-spacing: 6px;">${code}</p>
        <p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>
      `,
    });
  }
}
