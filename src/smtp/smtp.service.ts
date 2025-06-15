import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateSmtpDto } from './dto';
import { CryptoService } from 'src/crypto/crypto.service';
import * as nodemailer from 'nodemailer';

@Injectable()
export class SmtpService {
  constructor(
    private prisma: PrismaService,
    private cryptoService: CryptoService,
  ) {}

  async getConfig() {
    return this.prisma.smtpConfig.findFirst(); // или findUnique, если один
  }

  async updateConfig(dto: UpdateSmtpDto) {
    const encryptedPass = this.cryptoService.encrypt(dto.pass);
    const { id, ...data } = dto;
    if (!id) {
      return this.prisma.smtpConfig.create({
        data: {
          ...data,
          pass: encryptedPass,
        },
      });
    }
    return this.prisma.smtpConfig.update({
      where: { id: dto.id },
      data: {
        ...data,
        pass: encryptedPass,
      },
    });
  }

  async createTransporter() {
    const config = await this.getConfig();
    const decryptedPass = this.cryptoService.decrypt(config.pass);
    console.log(config, decryptedPass);
    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      service: 'gmail',
      secure: config.port === 465,
      auth: {
        user: config.user,
        pass: decryptedPass,
      },
    });
  }

  async sendTestEmail(to: string) {
    const transporter = await this.createTransporter();
    await transporter.sendMail({
      from: `"SMG" <smg@gmail.com>`,
      to,
      subject: 'Test Email',
      text: 'This is a test email from your SMTP config',
    });
  }
}
