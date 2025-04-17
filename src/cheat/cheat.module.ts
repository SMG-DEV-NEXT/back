import { Module } from '@nestjs/common';
import { CheatController } from './cheat.controller';
import { CheatService } from './cheat.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { PlanService } from 'src/plan/plan.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [AuthModule], // Import the AuthModule
  controllers: [CheatController],
  providers: [CheatService, PrismaService, PlanService],
})
export class CheatModule {}
