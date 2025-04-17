import { Controller, Get, Param, Body, Put, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/roles/roles.guard';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Put(':title')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async updateSetting(
    @Param('title') title: string,
    @Body('settings') settings: any,
  ) {
    return this.settingsService.updateSetting(title, settings);
  }

  @Get(':title')
  async getSettingByTitle(@Param('title') title: string) {
    return this.settingsService.getSettingByTitle(title);
  }

  @Get()
  async getAllSettings() {
    return this.settingsService.getAllSettings();
  }
}
