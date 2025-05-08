import { Module } from '@nestjs/common';
import { FaqService } from './faq.service';
import { FaqController } from './faq.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  controllers: [FaqController],
  imports: [AuthModule], // Import the AuthModule
  providers: [FaqService, PrismaService],
})
export class FaqModule {}
