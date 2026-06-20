import { Module } from '@nestjs/common';
import { PrismaAuditService } from 'src/prisma/prisma-audit.service';
import { AuditService } from './audit.service';
import { AuditLogsService } from './audit-logs.service';
import { AuditController } from './audit.controller';

@Module({
  controllers: [AuditController],
  providers: [AuditService, AuditLogsService, PrismaAuditService],
  exports: [AuditService],
})
export class AuditModule {}
