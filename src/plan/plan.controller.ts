import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  UseGuards,
  Req,
} from '@nestjs/common';
import { PlanService } from './plan.service';
import { CreatePlanDto, UpdatePlanDto, ParamsIdDto } from './dto';
import sendErrorNotification from 'src/utils/sendTGError';
import { AuthGuard } from '@nestjs/passport';
import { Role } from 'constants/roles';
import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { AuditService } from 'src/audit/audit.service';
import { AuditAction } from 'constants/audit-actions';
import { getAuditCtx } from 'src/utils/audit-ctx';

@Controller('plans')
export class PlanController {
  constructor(
    private readonly planService: PlanService,
    private readonly audit: AuditService,
  ) {}

  @Post()
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async create(@Body() createPlanDto: CreatePlanDto, @Req() req: any) {
    try {
      const result = await this.planService.create(createPlanDto);
      void this.audit.logAdmin(AuditAction.ADMIN_CREATE, getAuditCtx(req), {
        adminId: req.user?.id,
        entity: 'Plan',
        metadata: { id: (result as any)?.id, cheatId: createPlanDto?.cheatId },
      });
      return result;
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get()
  async getAll() {
    try {
      return this.planService.getAll();
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get(':id')
  async getById(@Param() params: ParamsIdDto) {
    try {
      return this.planService.getById(params.id);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async update(
    @Param() params: ParamsIdDto,
    @Body() updatePlanDto: UpdatePlanDto,
    @Req() req: any,
  ) {
    try {
      const result = await this.planService.update(params.id, updatePlanDto);
      void this.audit.logAdmin(AuditAction.ADMIN_UPDATE, getAuditCtx(req), {
        adminId: req.user?.id,
        entity: 'Plan',
        metadata: { id: params.id },
      });
      return result;
    } catch (error) {
      await sendErrorNotification(error);
    }
  }
}
