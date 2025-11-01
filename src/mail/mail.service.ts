import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import sendErrorNotification from 'src/utils/sendTGError';

@Injectable()
export class MailService {
  constructor() {}
  private adminTransporter = nodemailer.createTransport({
    host: 'mail.smgcheats.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.ADMIN_EMAIL,
      pass: process.env.ADMIN_EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false, // ⛔ temporary workaround only
    },
  });

  private noreplyTransporter = nodemailer.createTransport({
    host: 'mail.smgcheats.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.NOREPLY_EMAIL,
      pass: process.env.NOREPLY_EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false, // ⛔ temporary workaround only
    },
  });

  async sendFromAdmin(
    to: string,
    subject: string,
    text: string,
    html?: string,
  ) {
    try {
      const info = await this.adminTransporter.sendMail({
        from: process.env.ADMIN_EMAIL,
        to,
        subject,
        text,
        html,
      });
      return info;
    } catch (error) {
      console.error('Error sending email:', error);
      await sendErrorNotification(error);
    }
  }

  async sendFromNoreply(
    to: string,
    subject: string,
    text: string,
    html?: string,
  ) {
    try {
      const info = await this.noreplyTransporter.sendMail({
        from: process.env.NOREPLY_EMAIL,
        to,
        subject,
        text,
        html,
      });
      return info;
    } catch (error) {
      console.error('Error sending email:', error);
      await sendErrorNotification(error);
    }
  }
}
