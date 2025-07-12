// src/chat/chat.controller.ts
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SendMessageDto } from './dto';
import { TelegramService } from './telegram.service';
import { TelegramGateway } from './telegram.gateway';

@Controller('telegram')
export class TelegramController {
  constructor(
    private readonly telegramService: TelegramService,
    private readonly telegramGateWay: TelegramGateway,
    private readonly prisma: PrismaService,
  ) {}

  @Post('send')
  async sendMessage(@Body() dto: SendMessageDto) {
    const { name, text, role, chat, userId } = dto;

    // Send to Telegram with prefix
    await this.telegramService.sendMessage(name, text, role, userId, chat);

    // Save to MongoDB
    const saved = await this.prisma.message.create({
      data: { name, text, role, userId },
    });

    return {
      message: 'Sent successfully',
      data: saved,
    };
  }

  @Get('messages/:userId')
  async getMessagesChat(@Param('userId') userId: string) {
    return this.telegramService.getMessages(userId);
  }

  @Post('webhook')
  async handleUpdate(@Body() update: any) {
    if (update.message) {
      const msg = update.message;
      const id = update.message.chat.id;
      const name = msg.from?.first_name || 'Unknown';
      const text = msg.text || '';
      if (
        update.message.reply_to_message &&
        `${id}` !== process.env.TELEGRAM_ADMIN_GROUP_ID
      ) {
        const userId = this.telegramService.extractUserId(
          update.message.reply_to_message.text,
        );
        const message = await this.prisma.message.create({
          data: { name, text, role: 'support', userId },
        });

        this.telegramGateWay.sendMessageToUser(userId, 'new-message', message);
        return true;
      }

      // Save to DB
      if (`${id}` === process.env.TELEGRAM_ADMIN_GROUP_ID) {
        // Delete the first message where role is admin
        const oldestAdminMessage = await this.prisma.message.findMany({
          where: { role: 'admin' },
          orderBy: { timestamp: 'asc' },
        });

        if (oldestAdminMessage.length > 5) {
          await this.prisma.message.delete({
            where: { id: oldestAdminMessage[0].id },
          });
        }
        const saved = await this.prisma.message.create({
          data: {
            name,
            userId: '',
            text,
            role: 'admin', // or parse role if you want
          },
        });

        // Emit via WebSocket
        // this.telegramGateWay.sendMessageToAllClients(saved);
      }
    }
    return { ok: true };
  }
}
