import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [AuthModule],  // Import the AuthModule
  controllers: [StatsController],
  providers: [StatsService, PrismaService],
})
export class StatsModule {}