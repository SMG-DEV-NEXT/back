import { PrismaClient } from '@prisma/client';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { Module } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MailService } from 'src/mail/mail.service';
import { TokenService } from 'src/token/token.service';
import { RecaptchaService } from 'src/recaptcha/recaptcha.service';

@Module({
  imports: [],
  controllers: [UserController],
  providers: [
    UserService,
    PrismaClient,
    AuthService,
    PrismaService,
    JwtService,
    MailService,
    TokenService,
    RecaptchaService,
  ],
})
export class UserModule {}
