import { Module } from '@nestjs/common';
import { ContactService } from './contact.service';
import { ContactController } from './contact.controller';
import { AuthModule } from 'src/auth/auth.module';
import { AuditModule } from 'src/audit/audit.module';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [ContactController],
  providers: [ContactService, PrismaService],
  imports: [AuthModule, AuditModule],
})
export class ContactModule {}
