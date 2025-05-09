import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { SmtpService } from './smtp.service';
import { UpdateSmtpDto } from './dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import sendErrorNotification from 'src/utils/sendTGError';

@Controller('smtp')
export class SmtpController {
  constructor(private readonly smtpService: SmtpService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async getConfig() {
    try {
      return this.smtpService.getConfig();
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Put()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async update(@Body() dto: UpdateSmtpDto) {
    try {
      return this.smtpService.updateConfig(dto);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Post('test')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async testEmail(@Body() body: { to: string }) {
    try {
      return this.smtpService.sendTestEmail(body.to);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }
}
