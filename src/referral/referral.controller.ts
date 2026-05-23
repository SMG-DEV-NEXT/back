import { ReferralService } from './referral.service';
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  UseGuards,
  Query,
  Delete,
  Req,
} from '@nestjs/common';
import { CreateReferralDto, UpdateReferralDto } from './dto';
import { Role } from 'constants/roles';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import sendErrorNotification from 'src/utils/sendTGError';
import { OptionalJwtAuthGuard } from 'src/utils/isOptionalAuth';
import { AuditService } from 'src/audit/audit.service';
import { AuditAction } from 'constants/audit-actions';
import { getAuditCtx } from 'src/utils/audit-ctx';

@Controller('referral')
export class ReferralController {
  constructor(
    private readonly referralService: ReferralService,
    private readonly audit: AuditService,
  ) {}

  @Post()
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async create(@Body() dto: CreateReferralDto, @Req() req: any) {
    const result = await this.referralService.create(dto);
    void this.audit.logAdmin(AuditAction.ADMIN_CREATE, getAuditCtx(req), {
      adminId: req.user?.id,
      entity: 'Referral',
      metadata: { id: (result as any)?.id, code: dto?.code },
    });
    return result;
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateReferralDto,
    @Req() req: any,
  ) {
    const result = await this.referralService.update(id, dto);
    void this.audit.logAdmin(AuditAction.ADMIN_UPDATE, getAuditCtx(req), {
      adminId: req.user?.id,
      entity: 'Referral',
      metadata: { id },
    });
    return result;
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async delete(@Param('id') id: string, @Req() req: any) {
    try {
      const result = await this.referralService.delete(id);
      void this.audit.logAdmin(AuditAction.ADMIN_DELETE, getAuditCtx(req), {
        adminId: req.user?.id,
        entity: 'Referral',
        metadata: { id },
      });
      return result;
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get()
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async getAll(@Query('page') page = 1, @Query('limit') limit = 30) {
    try {
      return this.referralService.getAll(Number(page), Number(limit));
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get('admin/:ownerId')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  getAdminReferrals(@Param('ownerId') ownerId: string) {
    return this.referralService.findByOwner(ownerId);
  }

  @Get('user-referrals')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  getUserReferrals(@Query('page') page = 1, @Query('limit') limit = 30) {
    return this.referralService.getUserReferrals(Number(page), Number(limit));
  }

  @Get('metrics/:code')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  getReferralMetrics(@Param('code') code: string) {
    return this.referralService.getReferralMetrics(code);
  }

  @Get('check/:code')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  checkReferral(@Param('code') code: string) {
    return this.referralService.checkCode(code);
  }

  @Get('resolve/:code')
  @UseGuards(OptionalJwtAuthGuard)
  resolveReferral(@Param('code') code: string, @Req() req: any) {
    return this.referralService.resolveCodeForUser(
      code,
      req.user,
      req.query.isAlreadyResolved === 'true',
    );
  }

  @Post('track-view/:code')
  trackReferralView(@Param('code') code: string) {
    return this.referralService.incrementViewByCode(code);
  }

  @Get('/:id')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async getById(@Param('id') id: string) {
    try {
      return this.referralService.getById(id);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }
}
