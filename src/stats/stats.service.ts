import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateStatDto,
  GetAllStatsDto,
  GetAllStatsOfCatalog,
  UpdateStatsDto,
} from './dto';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) { }


  private async resolveStatWhereBySlugOrId(slugOrId: string) {
    const slugFilter: any = { slug: slugOrId };
    const bySlug = await this.prisma.stats.findFirst({
      where: slugFilter,
      select: { id: true },
    });

    if (bySlug) {
      return { id: bySlug.id };
    }

    return { id: slugOrId };
  }

  // 1. Get all games with count of stats
  async getAllGamesWithStatsCount() {
    const stats = await this.prisma.stats.findMany({
      orderBy: {
        view: 'desc', // Sort by views in descending order
      },
      where: {
        type: 'published',
        catalog: {
          type: 'published',
        },
      },
      take: 4,
    });
    const catalogs = await this.prisma.catalog.findMany({
      include: {
        stats: true,
      },
      where: {
        type: 'published',
        isDeleted: false,
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
      } as any,
    });
  }

  async getStatWithCatalog(slugOrId: string, isUser: boolean) {
    const where = await this.resolveStatWhereBySlugOrId(slugOrId);

    const stats = await this.prisma.stats.findMany({
      orderBy: {
        view: 'desc', // Sort by views in descending order
      },
      where: {
        id: {
          not: where.id,
        },
      },
      take: 4,
    });
    if (isUser) {
      const stat = await this.prisma.stats.update({
        where,
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
      where,
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
    const { catalogId, slug, titleen, titleru, ...data } = updateData;

    return this.prisma.stats.update({
      where: { id: statId },
      data: {
        ...data,
        titleen,
        titleru,
        slug,
        catalog: { connect: { id: catalogId } },
      } as any,
    });
  }

  // 6. Delete a stat
  async deleteStat(statId: string) {
    return this.prisma.stats.delete({
      where: { id: statId },
    });
  }

  async getAllStatsClient(id: string, query: GetAllStatsOfCatalog) {
    const { search, page = '1', limit = '30' } = query;

    const filters: any = {
      type: 'published',
      catalog: {
        type: 'published',
      },
    };

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
      this.prisma.catalog.findFirst({ where: { id, isDeleted: false } }),
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
      where: {
        type: 'published',
        catalog: {
          type: 'published',
        },
      },
      take: 4,
    });
  }
}
