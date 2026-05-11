import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { StatsService } from './stats.service';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { Roles } from 'src/auth/roles/roles.decorator';
import {
  CreateStatDto,
  GetAllStatsDto,
  GetAllStatsOfCatalog,
  UpdateStatsDto,
} from './dto';
import { Role } from 'constants/roles';
import { AuthGuard } from '@nestjs/passport';
import sendErrorNotification from 'src/utils/sendTGError';
import { AuditService } from 'src/audit/audit.service';
import { AuditAction } from 'constants/audit-actions';
import { getAuditCtx } from 'src/utils/audit-ctx';

@Controller('stats')
export class StatsController {
  constructor(
    private readonly statsService: StatsService,
    private readonly audit: AuditService,
  ) {}

  @Get('/games')
  async getAllGamesWithStatsCount() {
    try {
      return this.statsService.getAllGamesWithStatsCount();
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get('/game/:id')
  async getStatsOfCatalog(
    @Param() params: { id: string },
    @Query() query: GetAllStatsOfCatalog,
  ) {
    try {
      return this.statsService.getAllStatsClient(params.id, query);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get('/admin')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async getAllStats(@Query() query: GetAllStatsDto) {
    try {
      return this.statsService.getAllStats(query);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get('/top')
  async getTopStats() {
    try {
      return this.statsService.getTopStats();
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get('/sitemap')
  async getSitemapStats() {
    try {
      return this.statsService.getSitemapStats();
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get('/:id')
  async getStat(@Param() params: { id: string }) {
    try {
      return this.statsService.getStatWithCatalog(params.id, false);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get('/api/:id')
  async getStatUser(@Param() params: { id: string }) {
    try {
      return this.statsService.getStatWithCatalog(params.id, true);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('/')
  async createStat(@Body() createStatsDto: CreateStatDto, @Req() req: any) {
    try {
      const result = await this.statsService.createStatForGame(
        createStatsDto.catalogId,
        createStatsDto,
      );
      void this.audit.logAdmin(AuditAction.ADMIN_CREATE, getAuditCtx(req), {
        adminId: req.user?.id,
        entity: 'Stat',
        metadata: { id: (result as any)?.id, catalogId: createStatsDto.catalogId },
      });
      return result;
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch('/:statId')
  async updateStat(
    @Param('statId') statId: string,
    @Body() updateStatsDto: UpdateStatsDto,
    @Req() req: any,
  ) {
    try {
      const result = await this.statsService.updateStat(statId, updateStatsDto);
      void this.audit.logAdmin(AuditAction.ADMIN_UPDATE, getAuditCtx(req), {
        adminId: req.user?.id,
        entity: 'Stat',
        metadata: { id: statId },
      });
      return result;
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Delete('/:statId')
  async deleteStat(@Param('statId') statId: string, @Req() req: any) {
    try {
      const result = await this.statsService.deleteStat(statId);
      void this.audit.logAdmin(AuditAction.ADMIN_DELETE, getAuditCtx(req), {
        adminId: req.user?.id,
        entity: 'Stat',
        metadata: { id: statId },
      });
      return result;
    } catch (error) {
      await sendErrorNotification(error);
    }
  }
}
