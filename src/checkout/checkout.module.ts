import { Module } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CheckoutController } from './checkout.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { CryptoService } from 'src/crypto/crypto.service';
import { HttpModule } from '@nestjs/axios';
import { MailService } from 'src/mail/mail.service';
import { B2PayService } from 'src/b2pay/b2pay.service';

@Module({
  controllers: [CheckoutController],
  providers: [CheckoutService, PrismaService, CryptoService, MailService, B2PayService],
  imports: [HttpModule],
})
export class CheckoutModule { }
