import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PlanService } from 'src/plan/plan.service';
import { AuthModule } from 'src/auth/auth.module';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';

@Module({
  imports: [AuthModule], // Import the AuthModule
  controllers: [CommentController],
  providers: [CommentService, PrismaService, PlanService],
})
export class CommentModule {}
