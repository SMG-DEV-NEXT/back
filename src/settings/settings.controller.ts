import {
  Controller,
  Get,
  Param,
  Body,
  Put,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { AuthGuard } from '@nestjs/passport';
import { Role } from 'constants/roles';
import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import sendErrorNotification from 'src/utils/sendTGError';
import { AuditService } from 'src/audit/audit.service';
import { AuditAction } from 'constants/audit-actions';
import { getAuditCtx } from 'src/utils/audit-ctx';

@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly audit: AuditService,
  ) {}

  @Put(':title')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async updateSetting(
    @Param('title') title: string,
    @Body('settings') settings: any,
    @Req() req: any,
  ) {
    try {
      const result = await this.settingsService.updateSetting(title, settings);
      void this.audit.logAdmin(AuditAction.ADMIN_UPDATE, getAuditCtx(req), {
        adminId: req.user?.id,
        entity: 'Setting',
        metadata: { title },
      });
      return result;
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get(':title')
  async getSettingByTitle(@Param('title') title: string) {
    try {
      return this.settingsService.getSettingByTitle(title);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get()
  async getAllSettings() {
    try {
      return this.settingsService.getAllSettings();
    } catch (error) {
      await sendErrorNotification(error);
    }
  }
}
