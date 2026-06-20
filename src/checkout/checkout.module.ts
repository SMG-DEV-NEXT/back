import { Module } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CheckoutController } from './checkout.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { CryptoService } from 'src/crypto/crypto.service';
import { HttpModule } from '@nestjs/axios';
import { MailService } from 'src/mail/mail.service';
import { AuditModule } from 'src/audit/audit.module';

@Module({
  controllers: [CheckoutController],
  providers: [CheckoutService, PrismaService, CryptoService, MailService],
  imports: [HttpModule, AuditModule],
})
export class CheckoutModule {}
