import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateStatDto,
  GetAllStatsDto,
  GetAllStatsOfCatalog,
  UpdateStatsDto,
} from './dto';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  // 1. Get all games with count of stats
  async getAllGamesWithStatsCount() {
    const stats = await this.prisma.stats.findMany({
      orderBy: {
        view: 'desc', // Sort by views in descending order
      },
      take: 4,
    });
    const catalogs = await this.prisma.catalog.findMany({
      include: {
        stats: true,
      },
      where: {
        type: 'published',
      },
    });
    return {
      stats,
      games: catalogs,
    };
  }

  // 2. Get all stats of a game
  async getAllStats(query: GetAllStatsDto) {
    const {
      catalogId,
      startDate,
      endDate,
      search,
      page = '1',
      limit = '30',
    } = query;

    const filters: any = {};

    if (catalogId) {
      filters.catalogId = catalogId;
    }

    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) filters.createdAt.gte = new Date(startDate);
      if (endDate) filters.createdAt.lte = new Date(endDate);
    }

    if (search) {
      filters.OR = [
        { titleru: { contains: search, mode: 'insensitive' } },
        { titleen: { contains: search, mode: 'insensitive' } },
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      this.prisma.stats.findMany({
        where: filters,
        skip,
        include: {
          catalog: true,
        },
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.stats.count({ where: filters }),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / parseInt(limit)),
    };
  }
  // 4. Create a stat for a game
  async createStatForGame(catalogId: string, statsData: CreateStatDto) {
    return this.prisma.stats.create({
      data: {
        ...statsData,
        catalogId: catalogId,
        // game: { connect: { id: gameId } },
      },
    });
  }

  async getStatWithCatalog(id: string, isUser: boolean) {
    const stats = await this.prisma.stats.findMany({
      orderBy: {
        view: 'desc', // Sort by views in descending order
      },
      where: {
        id: {
          not: id,
        },
      },
      take: 4,
    });
    if (isUser) {
      const stat = await this.prisma.stats.update({
        where: { id },
        include: {
          catalog: true,
        },
        data: {
          view: {
            increment: 1,
          },
        },
      });
      return {
        ...stat,
        popular: stats,
      };
    }
    const stat = await this.prisma.stats.findFirst({
      where: { id },
      include: {
        catalog: true,
      },
    });
    return {
      ...stat,
      popular: stats,
    };
  }

  // 5. Update a stat for a game
  async updateStat(statId: string, updateData: UpdateStatsDto) {
    return this.prisma.stats.update({
      where: { id: statId },
      data: updateData,
    });
  }

  async getAllStatsClient(id: string, query: GetAllStatsOfCatalog) {
    const { search, page = '1', limit = '30' } = query;

    const filters: any = {};

    filters.catalogId = id;

    if (search) {
      filters.OR = [
        { titleru: { contains: search, mode: 'insensitive' } },
        { titleen: { contains: search, mode: 'insensitive' } },
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total, catalog] = await Promise.all([
      this.prisma.stats.findMany({
        where: filters,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.stats.count({ where: filters }),
      this.prisma.catalog.findFirst({ where: { id } }),
    ]);

    return {
      data,
      total,
      game: catalog,
      page,
      totalPages: Math.ceil(total / parseInt(limit)),
    };
  }

  async getTopStats() {
    return this.prisma.stats.findMany({
      orderBy: {
        view: 'desc',
      },
      take: 4,
    });
  }
}
