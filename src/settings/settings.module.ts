import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthModule } from 'src/auth/auth.module';
import { AuditModule } from 'src/audit/audit.module';

@Module({
  controllers: [SettingsController],
  imports: [AuthModule, AuditModule],
  providers: [SettingsService, PrismaService],
})
export class SettingsModule {}
