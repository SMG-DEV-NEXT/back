import {
  Controller,
  Post,
  Get,
  Delete,
  Query,
  Param,
  Body,
  UseGuards,
  Put,
  Req,
} from '@nestjs/common';
import { PromocodeService } from './promocode.service';
import { CreatePromocodeDto, UpdatePromocodeDto } from './dto';
import { Role } from 'constants/roles';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import sendErrorNotification from 'src/utils/sendTGError';
import { AuditService } from 'src/audit/audit.service';
import { AuditAction } from 'constants/audit-actions';
import { getAuditCtx } from 'src/utils/audit-ctx';

@Controller('promocode')
@Roles(Role.ADMIN)
export class PromocodeController {
  constructor(
    private readonly service: PromocodeService,
    private readonly audit: AuditService,
  ) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async create(@Body() dto: CreatePromocodeDto, @Req() req: any) {
    try {
      const result = await this.service.create(dto);
      void this.audit.logAdmin(AuditAction.ADMIN_CREATE, getAuditCtx(req), {
        adminId: req.user?.id,
        entity: 'Promocode',
        metadata: { id: result?.id, code: dto?.code },
      });
      return result;
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async getAll(@Query('page') page = 1, @Query('limit') limit = 30) {
    try {
      return this.service.getAll(Number(page), Number(limit));
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Post('check')
  async check(@Body() body: { code: string; cheatId?: string }) {
    try {
      return this.service.check(body.code, body.cheatId);
    } catch (error) {
      console.log(error);
      await sendErrorNotification(error);
    }
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async getOne(@Param('id') id: string) {
    try {
      return this.service.getOne(id);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePromocodeDto,
    @Req() req: any,
  ) {
    try {
      const result = await this.service.update(id, dto);
      void this.audit.logAdmin(AuditAction.ADMIN_UPDATE, getAuditCtx(req), {
        adminId: req.user?.id,
        entity: 'Promocode',
        metadata: { id },
      });
      return result;
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async delete(@Param('id') id: string, @Req() req: any) {
    try {
      const result = await this.service.delete(id);
      void this.audit.logAdmin(AuditAction.ADMIN_DELETE, getAuditCtx(req), {
        adminId: req.user?.id,
        entity: 'Promocode',
        metadata: { id },
      });
      return result;
    } catch (error) {
      await sendErrorNotification(error);
    }
  }
}
