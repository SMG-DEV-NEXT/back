import { Module } from '@nestjs/common';
import { ReferralService } from './referral.service';
import { ReferralController } from './referral.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthModule } from 'src/auth/auth.module';
import { AuditModule } from 'src/audit/audit.module';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [ReferralController],
  providers: [ReferralService, PrismaService],
})
export class ReferralModule {}
