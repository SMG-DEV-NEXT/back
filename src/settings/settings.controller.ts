import { Controller, Get, Param, Body, Put, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import sendErrorNotification from 'src/utils/sendTGError';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Put(':title')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async updateSetting(
    @Param('title') title: string,
    @Body('settings') settings: any,
  ) {
    try {
      return this.settingsService.updateSetting(title, settings);
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
