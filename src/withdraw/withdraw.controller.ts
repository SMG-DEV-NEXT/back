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

@Controller('withdraw')
export class WithdrawController {
    constructor(private readonly withdrawService: WithdrawService) { }

    @Post('request')
    @UseGuards(AuthGuard('jwt'))
    async createRequest(@Req() req: any, @Body() dto: CreateWithdrawRequestDto) {
        return this.withdrawService.create(req.user.id, dto);
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
    ) {
        return this.withdrawService.updateStatus(id, dto);
    }
}
