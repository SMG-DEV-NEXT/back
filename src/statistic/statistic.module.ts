import { Module } from '@nestjs/common';
import { StatisticService } from './statistic.service';
import { StatisticController } from './statistic.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  controllers: [StatisticController],
  imports: [AuthModule], // Import the AuthModule
  providers: [StatisticService, PrismaService],
})
export class StatisticModule {}
