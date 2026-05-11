import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { FaqService } from './faq.service';
import { CreateStatDto, UpdateBlockDto } from './dto';
import { UpdateStatDto } from './dto';
import { Role } from 'constants/roles';
import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import sendErrorNotification from 'src/utils/sendTGError';
import { AuditService } from 'src/audit/audit.service';
import { AuditAction } from 'constants/audit-actions';
import { getAuditCtx } from 'src/utils/audit-ctx';

@Controller('faq')
export class FaqController {
  constructor(
    private readonly faqService: FaqService,
    private readonly audit: AuditService,
  ) {}

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('admin/init')
  async initBlocks(@Req() req: any) {
    try {
      const result = await this.faqService.initBlocks();
      void this.audit.logAdmin(AuditAction.ADMIN_CREATE, getAuditCtx(req), {
        adminId: req.user?.id,
        entity: 'FaqBlock',
        metadata: { action: 'init' },
      });
      return result;
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('admin/remove')
  async deleteStat(@Body() dto: { id: string }, @Req() req: any) {
    try {
      const result = await this.faqService.deleteStat(dto.id);
      void this.audit.logAdmin(AuditAction.ADMIN_DELETE, getAuditCtx(req), {
        adminId: req.user?.id,
        entity: 'FaqStat',
        metadata: { id: dto.id },
      });
      return result;
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('admin/block/:id')
  async getBlock(@Param('id') id: string) {
    try {
      return this.faqService.getBlockFaq(id);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('admin/block/:id')
  async updateBlock(
    @Param('id') id: string,
    @Body() dto: UpdateBlockDto,
    @Req() req: any,
  ) {
    try {
      const result = await this.faqService.updateBlockFaq(id, dto);
      void this.audit.logAdmin(AuditAction.ADMIN_UPDATE, getAuditCtx(req), {
        adminId: req.user?.id,
        entity: 'FaqBlock',
        metadata: { id },
      });
      return result;
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('admin/stat')
  async createStat(@Body() dto: CreateStatDto, @Req() req: any) {
    try {
      const result = await this.faqService.createStat(dto);
      void this.audit.logAdmin(AuditAction.ADMIN_CREATE, getAuditCtx(req), {
        adminId: req.user?.id,
        entity: 'FaqStat',
        metadata: { id: (result as any)?.id },
      });
      return result;
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch('admin/stat/:id')
  async updateStat(
    @Param('id') id: string,
    @Body() dto: UpdateStatDto,
    @Req() req: any,
  ) {
    try {
      const result = await this.faqService.updateStat(id, dto);
      void this.audit.logAdmin(AuditAction.ADMIN_UPDATE, getAuditCtx(req), {
        adminId: req.user?.id,
        entity: 'FaqStat',
        metadata: { id },
      });
      return result;
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('admin/stat/:id')
  async getStat(@Param('id') id: string) {
    try {
      return this.faqService.getStatById(id);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('admin/faq')
  async getAdminFaq() {
    try {
      return this.faqService.getAllFaq();
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get('client/faq')
  async getClientFaq() {
    try {
      return this.faqService.getAllFaq();
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get('stats')
  async getAllStats() {
    try {
      return this.faqService.getAllStats();
    } catch (error) {
      await sendErrorNotification(error);
    }
  }
}
