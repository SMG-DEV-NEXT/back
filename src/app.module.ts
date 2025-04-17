// src/app.module.ts
import { Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './auth/auth.module';
import { MailService } from './mail/mail.service';
import { StatsModule } from './stats/stats.module';
import { CatalogModule } from './catalog/catalog.module';
import { PlanModule } from './plan/plan.module';
import { CheatModule } from './cheat/cheat.module';
import { CommentModule } from './comment/comment.module';
import { SettingsModule } from './settings/settings.module';
import { ResellerModule } from './reseller/reseller.module';
import { ContactModule } from './contact/contact.module';
import { PromocodeModule } from './promocode/promocode.module';
import { SmtpModule } from './smtp/smtp.module';
@Module({
  imports: [
    AuthModule,
    StatsModule,
    CatalogModule,
    PlanModule,
    CheatModule,
    CommentModule,
    SettingsModule,
    ResellerModule,
    ContactModule,
    PromocodeModule,
    SmtpModule,
  ],
  providers: [PrismaService, MailService],
})
export class AppModule {}
// npx prisma migrate dev --name init
