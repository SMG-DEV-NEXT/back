import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { TelegramGateway } from './telegram.gateway';
import { PrismaService } from 'src/prisma/prisma.service';
@Module({
  controllers: [TelegramController],
  providers: [TelegramService, TelegramGateway, PrismaService],
})
export class TelegramModule {}
