import { Module } from '@nestjs/common';
import { PlanService } from './plan.service';
import { PlanController } from './plan.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditModule } from 'src/audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [PlanService, PrismaService],
  controllers: [PlanController],
  exports: [PlanService],
})
export class PlanModule {}
