import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from 'constants/roles';
import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { CreateWithdrawRequestDto, UpdateWithdrawStatusDto } from './dto';
import { WithdrawService } from './withdraw.service';
import { AuditService } from 'src/audit/audit.service';
import { AuditAction } from 'constants/audit-actions';
import { getAuditCtx } from 'src/utils/audit-ctx';

@Controller('withdraw')
export class WithdrawController {
    constructor(
        private readonly withdrawService: WithdrawService,
        private readonly audit: AuditService,
    ) {}

    @Post('request')
    @UseGuards(AuthGuard('jwt'))
    async createRequest(@Req() req: any, @Body() dto: CreateWithdrawRequestDto) {
        const result = await this.withdrawService.create(req.user.id, dto);
        void this.audit.logTransaction(AuditAction.BALANCE_CHANGE, getAuditCtx(req), {
            userId: req.user.id,
            metadata: { action: 'withdraw_request', amount: dto?.amount, method: dto?.method },
        });
        return result;
    }

    @Get('my')
    @UseGuards(AuthGuard('jwt'))
    async getMy(@Req() req: any) {
        return this.withdrawService.getMyRequests(req.user.id);
    }

    @Get('request')
    @Roles(Role.ADMIN)
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    async getAll(
        @Query('skip') skip = '0',
        @Query('take') take = '20',
    ) {
        return this.withdrawService.getAll(Number(skip), Number(take));
    }

    @Get('request/pending-count')
    @Roles(Role.ADMIN)
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    async getPendingCount() {
        return this.withdrawService.getPendingCount();
    }

    @Get('request/:id')
    @Roles(Role.ADMIN)
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    async getOne(@Param('id') id: string) {
        return this.withdrawService.getOne(id);
    }

    @Patch('request/:id')
    @Roles(Role.ADMIN)
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    async updateStatus(
        @Param('id') id: string,
        @Body() dto: UpdateWithdrawStatusDto,
        @Req() req: any,
    ) {
        const result = await this.withdrawService.updateStatus(id, dto);
        void this.audit.logAdmin(AuditAction.ADMIN_UPDATE, getAuditCtx(req), {
            adminId: req.user?.id,
            entity: 'WithdrawRequest',
            metadata: { id, status: dto?.status },
        });
        return result;
    }
}
