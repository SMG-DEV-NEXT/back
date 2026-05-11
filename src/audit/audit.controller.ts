import {
  Controller,
  Delete,
  Get,
  Query,
  Headers,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { Role } from 'constants/roles';
import { AuditLogsService } from './audit-logs.service';

@Controller('audit')
@Roles(Role.ADMIN)
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AuditController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  private checkPassword(password: string): void {
    const expected = process.env.AUDIT_LOGS_PASSWORD;
    if (!expected || password !== expected) {
      throw new UnauthorizedException('Invalid audit password');
    }
  }

  @Get('logs')
  async getLogs(
    @Headers('x-audit-password') password: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('search') search?: string,
    @Query('ip') ip?: string,
    @Query('entity') entity?: string,
    @Query('severity') severity?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    this.checkPassword(password);
    return this.auditLogsService.getLogs({
      page: Number(page),
      limit: Math.min(Number(limit), 100),
      search,
      ip,
      entity,
      severity,
      startDate,
      endDate,
    });
  }

  @Get('logs/entities')
  async getEntities(@Headers('x-audit-password') password: string) {
    this.checkPassword(password);
    return this.auditLogsService.getDistinctEntities();
  }

  @Delete('logs')
  async clearLogs(@Headers('x-audit-password') password: string) {
    this.checkPassword(password);
    return this.auditLogsService.clearLogs();
  }
}
