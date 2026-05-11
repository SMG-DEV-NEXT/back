import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { CheatService } from './cheat.service';
import {
  CreateCheatDto,
  GetCheatsDto,
  GetStatusCheatsDto,
  ParamsFilterDto,
  ParamsIdDto,
  UpdateCheatDto,
} from './dto';
import { Role } from 'constants/roles';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import sendErrorNotification from 'src/utils/sendTGError';
import { OptionalJwtAuthGuard } from 'src/utils/isOptionalAuth';
import { AuditService } from 'src/audit/audit.service';
import { AuditAction } from 'constants/audit-actions';
import { getAuditCtx } from 'src/utils/audit-ctx';

@Controller('cheats')
export class CheatController {
  constructor(
    private readonly cheatService: CheatService,
    private readonly audit: AuditService,
  ) {}

  @Post('/restore')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async restoreCheat(@Body() { id }: { id: string }, @Req() req: any) {
    try {
      const result = await this.cheatService.restoreCheat(id);
      void this.audit.logAdmin(AuditAction.ADMIN_UPDATE, getAuditCtx(req), {
        adminId: req.user?.id,
        entity: 'Cheat',
        metadata: { id, action: 'restore' },
      });
      return result;
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Post()
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async create(@Body() createCheatDto: CreateCheatDto, @Req() req: any) {
    try {
      const result = await this.cheatService.create(createCheatDto);
      void this.audit.logAdmin(AuditAction.ADMIN_CREATE, getAuditCtx(req), {
        adminId: req.user?.id,
        entity: 'Cheat',
        metadata: { id: (result as any)?.id, title: createCheatDto?.titleEn },
      });
      return result;
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get('head/:search')
  async searchCheat(@Param() params: { search: string }) {
    try {
      return this.cheatService.searchCheat(params.search);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get()
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async getAll() {
    try {
      return this.cheatService.getAll();
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get('plans/:catalogId')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async getAllWithPlans(@Param() params: ParamsFilterDto) {
    try {
      return this.cheatService.getAllWithPlans(params.catalogId);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get('status-page')
  async getCheatStatusData(@Query() params: GetStatusCheatsDto) {
    try {
      return this.cheatService.getCheatStatusPageData(params);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get('/deleted')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async getDeletedCheats() {
    try {
      return this.cheatService.getDeletedCheats();
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async getById(@Param() params: ParamsIdDto) {
    try {
      return this.cheatService.getById(params.id);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get('view/:id')
  @UseGuards(OptionalJwtAuthGuard)
  async getByIdClient(@Param() params: ParamsIdDto, @Req() req: any) {
    try {
      const user = req.user;
      return this.cheatService.getCheatView(params.id, user);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async update(
    @Param() params: ParamsIdDto,
    @Body() updateCheatDto: UpdateCheatDto,
    @Req() req: any,
  ) {
    try {
      const result = await this.cheatService.update(params.id, updateCheatDto);
      void this.audit.logAdmin(AuditAction.ADMIN_UPDATE, getAuditCtx(req), {
        adminId: req.user?.id,
        entity: 'Cheat',
        metadata: { id: params.id },
      });
      return result;
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Delete('many')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async deleteMany(@Body() ids: string[], @Req() req: any) {
    try {
      const result = await this.cheatService.deleteMany(ids);
      void this.audit.logAdmin(AuditAction.ADMIN_DELETE, getAuditCtx(req), {
        adminId: req.user?.id,
        entity: 'Cheat',
        metadata: { ids, count: ids?.length },
      });
      return result;
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async delete(@Param() params: ParamsIdDto, @Req() req: any) {
    try {
      const result = await this.cheatService.delete(params.id);
      void this.audit.logAdmin(AuditAction.ADMIN_DELETE, getAuditCtx(req), {
        adminId: req.user?.id,
        entity: 'Cheat',
        metadata: { id: params.id },
      });
      return result;
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get('/api/all')
  async getCheats(@Query() query: GetCheatsDto) {
    try {
      return this.cheatService.apiCheats(query);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get('/api/top')
  async getTopCheats() {
    try {
      return this.cheatService.getTopCheats();
    } catch (error) {
      await sendErrorNotification(error);
    }
  }
}
