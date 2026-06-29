import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  private transporter() {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    if (!process.env.SMTP_USER) {
      this.logger.warn(`Email yuborilmadi (SMTP sozlanmagan): ${subject} → ${to}`);
      return;
    }
    try {
      await this.transporter().sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        html,
      });
    } catch (err) {
      this.logger.error(`Email xatosi: ${err}`);
    }
  }

  async sendPasswordReset(to: string, token: string, name?: string): Promise<void> {
    const url = `${process.env.NEXT_PUBLIC_API_URL?.replace(':4000', ':3001') || 'http://localhost:3001'}/reset-password?token=${token}`;
    await this.send(to, 'Parolni tiklash — Wisar', `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#3b5bdb">Parolni tiklash</h2>
        <p>Salom${name ? ` ${name}` : ''}! Parolni tiklash so'rovi qabul qilindi.</p>
        <a href="${url}" style="display:inline-block;background:#3b5bdb;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;margin:16px 0">Parolni tiklash →</a>
        <p style="color:#888;font-size:13px">Havola 1 soat amal qiladi. Agar siz so'rov yubormagansiz — bu emailni e'tiborsiz qoldiring.</p>
      </div>
    `);
  }

  async sendVerificationCode(to: string, code: string, name?: string): Promise<void> {
    await this.send(to, `Wisar — tasdiqlash kodi: ${code}`, `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#16a34a">Email tasdiqlash</h2>
        <p>Salom${name ? ` ${name}` : ''}! Wisar'ga ro'yxatdan o'tganingiz uchun rahmat.</p>
        <p>Tasdiqlash kodingiz:</p>
        <div style="font-size:34px;font-weight:bold;letter-spacing:8px;color:#16a34a;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:18px;text-align:center;margin:16px 0">${code}</div>
        <p style="color:#888;font-size:13px">Kod 15 daqiqa amal qiladi. Agar siz ro'yxatdan o'tmagan bo'lsangiz — bu emailni e'tiborsiz qoldiring.</p>
      </div>
    `);
  }

  async sendWeeklySummary(to: string, name: string, completed: number, streak: number): Promise<void> {
    await this.send(to, 'Haftalik hisobot — Wisar', `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#3b5bdb">Haftalik hisobot 📊</h2>
        <p>Salom ${name}! Bu hafta:</p>
        <ul style="font-size:16px;line-height:2">
          <li>📚 <strong>${completed}</strong> bob o'qidingiz</li>
          <li>🔥 Streak: <strong>${streak}</strong> kun</li>
        </ul>
        <a href="${process.env.NEXT_PUBLIC_API_URL?.replace(':4000', ':3001') || 'http://localhost:3001'}" style="display:inline-block;background:#3b5bdb;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;margin:16px 0">Platformaga o'tish →</a>
      </div>
    `);
  }
}
