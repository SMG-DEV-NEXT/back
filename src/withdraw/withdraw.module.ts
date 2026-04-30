import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { WithdrawController } from './withdraw.controller';
import { WithdrawService } from './withdraw.service';

@Module({
    imports: [AuthModule],
    controllers: [WithdrawController],
    providers: [WithdrawService, PrismaService],
})
export class WithdrawModule { }
