import { Module } from '@nestjs/common';
import { ResellerService } from './reseller.service';
import { ResellerController } from './reseller.controller';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [ResellerController],
  imports: [AuthModule], // Import the AuthModule
  providers: [ResellerService, PrismaService],
})
export class ResellerModule {}
