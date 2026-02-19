import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { StatisticService } from './statistic.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import sendErrorNotification from 'src/utils/sendTGError';

@Controller('statistic')
export class StatisticController {
  constructor(private readonly statisticService: StatisticService) { }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async getRevenueTrend() {
    try {
      return this.statisticService.getStats();
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get('/chart')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async getChartData(
    @Query('range') range?: 'week' | 'month',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    try {
      return this.statisticService.getRevenueTrend({ range, from, to });
    } catch (error) {
      await sendErrorNotification(error);
    }
  }
}
