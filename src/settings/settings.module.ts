import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthService } from 'src/auth/auth.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  controllers: [SettingsController],
  imports: [AuthModule], // Import the AuthModule
  providers: [SettingsService, PrismaService],
})
export class SettingsModule {}
