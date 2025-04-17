import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { SmtpService } from './smtp.service';
import { UpdateSmtpDto } from './dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/roles/roles.guard';

@Controller('smtp')
export class SmtpController {
  constructor(private readonly smtpService: SmtpService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  getConfig() {
    return this.smtpService.getConfig();
  }

  @Put()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  update(@Body() dto: UpdateSmtpDto) {
    return this.smtpService.updateConfig(dto);
  }

  @Post('test')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  testEmail(@Body() body: { to: string }) {
    return this.smtpService.sendTestEmail(body.to);
  }
}
