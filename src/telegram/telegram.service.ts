// telegram-bot.service.ts
import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from 'src/prisma/prisma.service';
import { Telegraf } from 'telegraf';

@Injectable()
export class TelegramService {
  private readonly token = process.env.TELEGRAM_BOT_TOKEN;

  constructor(private prisma: PrismaService) {}

  private getChatId(role: 'user' | 'admin'): string {
    return role === 'admin'
      ? process.env.TELEGRAM_ADMIN_GROUP_ID
      : process.env.TELEGRAM_USER_GROUP_ID;
  }

  async sendMessage(
    name: string,
    message: string,
    role: 'user' | 'admin',
    userId: string,
    chat: string,
  ) {
    const msg = `👤 ${name} (ID: ${userId}):\n${message}`;
    const idChat =
      chat === 'support'
        ? process.env.SUPPORT_CHAT_ID
        : process.env.TELEGRAM_ADMIN_GROUP_ID;
    try {
      await axios.post(
        `https://api.telegram.org/bot${this.token}/sendMessage`,
        {
          chat_id: idChat,
          text: msg,
        },
      );
    } catch (e) {
      return e;
    }
  }

  getMessages(userId: string) {
    return this.prisma.message.findMany({
      where: {
        OR: [{ userId }, { role: 'admin' }],
      },
    });
  }

  extractUserId(str) {
    const match = str.match(/\(ID:\s?([a-zA-Z0-9_-]+)\)/);
    return match ? match[1] : null;
  }
}
