import { Module } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CheckoutController } from './checkout.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { SmtpService } from 'src/smtp/smtp.service';
import { CryptoService } from 'src/crypto/crypto.service';
import { HttpModule } from '@nestjs/axios';
import { MailService } from 'src/mail/mail.service';

@Module({
  controllers: [CheckoutController],
  providers: [
    CheckoutService,
    PrismaService,
    SmtpService,
    CryptoService,
    MailService,
  ],
  imports: [HttpModule],
})
export class CheckoutModule {}
