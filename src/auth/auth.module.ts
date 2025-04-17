import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { PrismaService } from "src/prisma/prisma.service";
import { SanitizeService } from "src/santizie/santizie.service";
import { JwtStrategy } from "src/credentials/jwt";
import { TwoFactorAuthService } from "src/twofactor/towfactor.service";
import { MailService } from "src/mail/mail.service";
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET, // Ensure you have JWT_SECRET in your .env
      signOptions: { expiresIn: "15m" }, // Default access token expiry
    }),
  ],
  providers: [AuthService, PrismaService,SanitizeService,JwtStrategy,TwoFactorAuthService,MailService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
