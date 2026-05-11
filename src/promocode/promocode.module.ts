import { Module } from '@nestjs/common';
import { PromocodeService } from './promocode.service';
import { PromocodeController } from './promocode.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthModule } from 'src/auth/auth.module';
import { AuditModule } from 'src/audit/audit.module';

@Module({
  controllers: [PromocodeController],
  providers: [PromocodeService, PrismaService],
  imports: [AuthModule, AuditModule],
})
export class PromocodeModule {}
