import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { StatisticService } from './statistic.service';
import { AuthGuard } from '@nestjs/passport';
import { Role } from 'constants/roles';
import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import sendErrorNotification from 'src/utils/sendTGError';

@Controller('statistic')
export class StatisticController {
  constructor(private readonly statisticService: StatisticService) { }

  @Get()
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async getRevenueTrend() {
    try {
      return this.statisticService.getStats();
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get('/top-buyers')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async getTopBuyers() {
    try {
      return this.statisticService.getTopBuyers();
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get('/payment-methods')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async getPaymentMethodStats() {
    try {
      return this.statisticService.getPaymentMethodStats();
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get('/top-cheats')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async getTopCheats() {
    try {
      return this.statisticService.getTopCheats();
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get('/chart')
  @Roles(Role.ADMIN)
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
