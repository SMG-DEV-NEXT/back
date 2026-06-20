import { Injectable } from '@nestjs/common';
import * as dayjs from 'dayjs';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class StatisticService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [keysSold, newUsers, sales] = await Promise.all([
      this.getKeysSold(),
      this.getNewUsers(),
      this.getTotalSales(),
    ]);

    return { keysSold, newUsers, sales };
  }

  private async getKeysSold() {
    const total = await this.prisma.transaction.count();

    const lastWeek = await this.prisma.transaction.count({
      where: {
        status: 'success',
        createdAt: { gte: dayjs().subtract(7, 'days').toDate() },
      },
    });

    const lastWeekData = await this.prisma.transaction.findMany({
      where: {
        status: 'success',
        createdAt: { gte: dayjs().subtract(7, 'days').toDate() },
      },
    });

    const previousWeek = await this.prisma.transaction.count({
      where: {
        status: 'success',
        createdAt: {
          gte: dayjs().subtract(14, 'days').toDate(),
          lt: dayjs().subtract(7, 'days').toDate(),
        },
      },
    });

    const percentChange = this.getPercentChange(lastWeek, previousWeek);

    return {
      total,
      percentChange,
      lastWeek: lastWeekData,
      trend: await this.getDailyCount('KEY_PURCHASE'),
    };
  }

  private async getNewUsers() {
    const total = await this.prisma.user.count();

    const lastWeek = await this.prisma.user.count({
      where: { createdAt: { gte: dayjs().subtract(7, 'days').toDate() } },
    });

    const previousWeek = await this.prisma.user.count({
      where: {
        createdAt: {
          gte: dayjs().subtract(14, 'days').toDate(),
          lt: dayjs().subtract(7, 'days').toDate(),
        },
      },
    });

    const percentChange = this.getPercentChange(lastWeek, previousWeek);

    return {
      total,
      percentChange,
      trend: await this.getUserTrend(),
    };
  }

  private async getTotalSales() {
    const totalResult = await this.prisma.transaction.aggregate({
      _sum: { realPrice: true },
      where: { status: 'success' },
    });

    const lastWeekResult = await this.prisma.transaction.aggregate({
      _sum: { realPrice: true },
      where: {
        status: 'success',
        createdAt: { gte: dayjs().subtract(7, 'days').toDate() },
      },
    });

    const previousWeekResult = await this.prisma.transaction.aggregate({
      _sum: { realPrice: true },
      where: {
        type: 'KEY_PURCHASE',
        status: 'success',
        createdAt: {
          gte: dayjs().subtract(14, 'days').toDate(),
          lt: dayjs().subtract(7, 'days').toDate(),
        },
      },
    });

    const total = totalResult._sum.realPrice || 0;
    const lastWeek = lastWeekResult._sum.realPrice || 0;
    const previousWeek = previousWeekResult._sum.realPrice || 0;

    const percentChange = this.getPercentChange(lastWeek, previousWeek);

    return {
      total,
      percentChange,
      trend: await this.getSalesTrend(),
    };
  }

  private getPercentChange(current: number, previous: number): number {
    if (previous === 0 && current === 0) return 0;
    if (previous === 0) return 100;
    return +((current / previous) * 100).toFixed(1);
  }

  private async getDailyCount(type: string) {
    const results = await this.prisma.transaction.findMany({
      where: {
        status: 'success',
        createdAt: {
          gte: dayjs().subtract(7, 'days').startOf('day').toDate(),
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const days = Array(7).fill(0);
    for (const tx of results) {
      const dayIndex =
        dayjs(tx.createdAt).diff(dayjs().startOf('day'), 'day') + 6;
      if (dayIndex >= 0 && dayIndex < 7) days[dayIndex]++;
    }

    return days;
  }

  private async getUserTrend() {
    const users = await this.prisma.user.findMany({
      where: {
        createdAt: {
          gte: dayjs().subtract(7, 'days').startOf('day').toDate(),
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const days = Array(7).fill(0);
    for (const user of users) {
      const dayIndex =
        dayjs(user.createdAt).diff(dayjs().startOf('day'), 'day') + 6;
      if (dayIndex >= 0 && dayIndex < 7) days[dayIndex]++;
    }

    return days;
  }

  private async getSalesTrend() {
    const sales = await this.prisma.transaction.findMany({
      where: {
        status: 'success',
        createdAt: {
          gte: dayjs().subtract(7, 'days').startOf('day').toDate(),
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const days = Array(7).fill(0);
    for (const tx of sales) {
      const dayIndex =
        dayjs(tx.createdAt).diff(dayjs().startOf('day'), 'day') + 6;
      if (dayIndex >= 0 && dayIndex < 7) days[dayIndex] += tx.realPrice;
    }

    return days.map((n) => +n.toFixed(2));
  }
  async getTopBuyers() {
    const groups = await this.prisma.transaction.groupBy({
      by: ['userId'],
      where: { status: 'success', userId: { not: null } },
      _count: { id: true },
      _sum: { realPrice: true },
      orderBy: { _sum: { realPrice: 'desc' } },
      take: 10,
    });

    const users = await this.prisma.user.findMany({
      where: { id: { in: groups.map((g) => g.userId) } },
      select: { id: true, name: true, email: true, logo: true },
    });

    return groups.map((g) => {
      const user = users.find((u) => u.id === g.userId);
      return {
        userId: g.userId,
        name: user?.name ?? '',
        email: user?.email ?? '',
        logo: user?.logo ?? '',
        orders: g._count.id,
        totalSpent: +(g._sum.realPrice ?? 0).toFixed(0),
      };
    });
  }

  async getPaymentMethodStats() {
    const groups = await this.prisma.transaction.groupBy({
      by: ['methodPay'],
      where: { status: 'success' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const total = groups.reduce((sum, g) => sum + g._count.id, 0);

    return groups.map((g) => ({
      method: g.methodPay,
      count: g._count.id,
      percent: total > 0 ? +((g._count.id / total) * 100).toFixed(1) : 0,
    }));
  }

  async getTopCheats() {
    const groups = await this.prisma.transaction.groupBy({
      by: ['cheatId'],
      where: { status: 'success' },
      _count: { id: true },
      _sum: { realPrice: true },
      orderBy: { _count: { id: 'desc' } },
      take: 3,
    });

    const cheats = await this.prisma.cheat.findMany({
      where: { id: { in: groups.map((g) => g.cheatId) } },
      select: { id: true, titleRu: true, titleEn: true, imageUrl: true },
    });

    return groups.map((g) => {
      const cheat = cheats.find((c) => c.id === g.cheatId);
      return {
        cheatId: g.cheatId,
        titleRu: cheat?.titleRu ?? '',
        titleEn: cheat?.titleEn ?? '',
        imageUrl: cheat?.imageUrl ?? '',
        sales: g._count.id,
        revenue: +(g._sum.realPrice ?? 0).toFixed(0),
      };
    });
  }

  async getRevenueTrend({ range, from, to }) {
    const now = dayjs();
    let startDate: dayjs.Dayjs;
    let endDate: dayjs.Dayjs;

    if (from && to) {
      startDate = dayjs(from).startOf('day');
      endDate = dayjs(to).endOf('day');
    } else {
      const days = range === 'month' ? 30 : 7;
      endDate = now.endOf('day');
      startDate = endDate.subtract(days * 2 - 1, 'day').startOf('day');
    }

    const diffDays = endDate.diff(startDate, 'day');
    const result = await this.prisma.transaction.findMany({
      where: {
        status: 'success',
        createdAt: {
          gte: startDate.toDate(),
          lte: endDate.toDate(),
        },
      },
      select: {
        realPrice: true,
        createdAt: true,
        cheat: true,
        type: true,
      },
    });

    // Create revenue buckets for each day
    const dailyRevenue = Array(diffDays + 1).fill(0);

    result.forEach((tx) => {
      const index = dayjs(tx.createdAt).diff(startDate, 'day');
      if (index >= 0 && index <= diffDays) {
        dailyRevenue[index] += tx.realPrice;
      }
    });

    let trend = dailyRevenue;
    let percent = null;

    if (!from || !to) {
      // Это случай с range (автоматический диапазон)
      const half = Math.floor(dailyRevenue.length / 2);
      const previous = dailyRevenue.slice(0, half).reduce((a, b) => a + b, 0);
      const current = dailyRevenue.slice(half).reduce((a, b) => a + b, 0);
      percent =
        previous === 0
          ? current === 0
            ? 0
            : 100
          : +((current / previous) * 100).toFixed(1);

      trend = dailyRevenue;
    }
    return {
      percent,
      trend,
      result,
    };
  }
}
