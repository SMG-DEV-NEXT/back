import { Module } from '@nestjs/common';
import { ResellerService } from './reseller.service';
import { ResellerController } from './reseller.controller';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { TelegramService } from 'src/telegram/telegram.service';

@Module({
  controllers: [ResellerController],
  imports: [AuthModule], // Import the AuthModule
  providers: [ResellerService, PrismaService, JwtService, TelegramService],
})
export class ResellerModule {}
