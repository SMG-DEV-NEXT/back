import {
  Controller,
  Delete,
  Get,
  Query,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditLogsService: AuditLogsService) { }

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
