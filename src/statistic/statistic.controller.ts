import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { StatisticService } from './statistic.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import sendErrorNotification from 'src/utils/sendTGError';

@Controller('statistic')
export class StatisticController {
  constructor(private readonly statisticService: StatisticService) {}

  @Get()
  getRevenueTrend() {
    return this.statisticService.getStats();
  }

  @Get('/chart')
  async getChartData(
    @Query('range') range?: 'week' | 'month',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    try {
      throw new Error('💥 Искусственная ошибка для теста');

      return this.statisticService.getRevenueTrend({ range, from, to });
    } catch (error) {
      await sendErrorNotification(error);
    }
  }
}
