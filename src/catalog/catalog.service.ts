import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateDto } from './dto';
import { isNumber } from 'class-validator';

@Injectable()
export class CatalogService {
  fields = {
    id: true,
    price: true,
    prcent: true,
  };
  constructor(private prisma: PrismaService) {}

  async createCatalog(data: CreateDto) {
    await this.shiftPositions(data.position);
    return this.prisma.catalog.create({ data });
  }

  async updateCatalog(id: string, data: Prisma.CatalogUpdateInput) {
    const existingCatalog = await this.prisma.catalog.findUnique({
      where: { id },
    });

    if (existingCatalog.position !== data.position && isNumber(data.position)) {
      await this.shiftPositions(data.position);
    }
    return this.prisma.catalog.update({ where: { id }, data });
  }

  async getAllCatalogs() {
    return this.prisma.catalog.findMany({
      include: { cheats: true },
      orderBy: {
        position: 'desc',
      },
    });
  }

  async getAllPublishedCatalogs() {
    return this.prisma.catalog.findMany({
      include: { cheats: true },
      where: {
        type: 'published',
      },
      orderBy: {
        position: 'desc',
      },
    });
  }

  async getCatalog(id: string) {
    const catalog = this.prisma.catalog.findFirst({
      include: { cheats: true },
      where: {
        link: id,
      },
      orderBy: {
        position: 'desc',
      },
    });
    if (!catalog) {
      throw new NotFoundException('Каталог не найден');
    }
    return catalog;
  }

  async getCatalogAdmin(id: string) {
    const catalog = this.prisma.catalog.findFirst({
      include: { cheats: true },
      where: {
        id: id,
      },
      orderBy: {
        position: 'desc',
      },
    });
    if (!catalog) {
      throw new NotFoundException('Каталог не найден');
    }
    return catalog;
  }

  async deleteCatalog(id: string): Promise<{ message: string }> {
    // Check if catalog exists
    const catalog = await this.prisma.catalog.findFirst({ where: { id } });
    if (!catalog) {
      throw new NotFoundException('Каталог не найден');
    }
    const cheatsInCatalog = await this.prisma.cheat.findMany({
      where: { catalogId: catalog.id },
      select: { id: true },
    });

    const cheatIds = cheatsInCatalog.map((c) => c.id);

    const existingTransactions = await this.prisma.transaction.findMany({
      where: {
        cheatId: { in: cheatIds },
      },
    });
    if (existingTransactions.length) {
      throw new BadRequestException(
        'The Catalog cannot be deleted because it has cheats with transactions.',
      );
    }

    // Delete related cheats first
    await this.prisma.comment.deleteMany({
      where: {
        cheat: {
          catalogId: id,
        },
      },
    });
    await this.prisma.stats.deleteMany({
      where: {
        catalogId: id,
      },
    });
    await this.prisma.cheat.deleteMany({ where: { catalogId: id } });

    // Delete the catalog
    await this.prisma.catalog.delete({ where: { id } });

    return { message: id };
  }

  async deleteMultipleCatalogs(ids: string[]): Promise<{ message: string }> {
    if (!ids || ids.length === 0) {
      throw new NotFoundException('Список каталогов пуст');
    }
    const cheatsInCatalog = await this.prisma.cheat.findMany({
      where: {
        catalogId: {
          in: ids,
        },
      },
      select: { id: true },
    });

    const cheatIds = cheatsInCatalog.map((c) => c.id);

    const existingTransactions = await this.prisma.transaction.findMany({
      where: {
        cheatId: { in: cheatIds },
      },
    });
    if (existingTransactions.length) {
      throw new BadRequestException(
        'The Catalog cannot be deleted because it has cheats with transactions.',
      );
    }

    // Delete all related cheats first
    await this.prisma.cheat.deleteMany({ where: { catalogId: { in: ids } } });

    // Delete catalogs
    const deleteResult = await this.prisma.catalog.deleteMany({
      where: { id: { in: ids } },
    });

    if (deleteResult.count === 0) {
      throw new NotFoundException('Ни один из каталогов не найден');
    }

    return {
      message: `Удалено ${deleteResult.count} каталогов и связанные элементы`,
    };
  }

  async getCatalogsWithCheats({ search, page, limit = 16 }) {
    const skip = (page - 1) * limit;
    const where = {
      title: { contains: search, mode: 'insensitive' },
    };

    const [data, total] = await Promise.all([
      this.prisma.catalog.findMany({
        where: {
          title: { contains: search, mode: 'insensitive' },
          type: 'published',
        },
        include: {
          cheats: {
            where: {
              status: 'published',
            },
            include: {
              plan: {
                include: {
                  day: true,
                  month: true,
                  week: true,
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { position: 'asc' },
      }),
      this.prisma.catalog.count({
        where: {
          title: { contains: search, mode: 'insensitive' },
          type: 'published',
        },
      }),
    ]);

    return {
      total: Math.ceil(total / limit),
      page,
      limit,
      data,
    };
  }

  private async shiftPositions(position: number) {
    await this.prisma.$transaction([
      this.prisma.catalog.updateMany({
        where: { position: { gte: position } },
        data: { position: { increment: 1 } },
      }),
    ]);
  }

  async getTopCatalogs() {
    return this.prisma.cheat.findMany({
      take: 6,
      orderBy: {
        position: 'asc',
      },
      where: {
        status: 'published',
      },

      include: {
        catalog: {
          select: {
            link: true,
          },
        },
        plan: {
          include: {
            day: {
              select: this.fields,
            },
            week: {
              select: this.fields,
            },
            month: {
              select: this.fields,
            },
          },
        },
        // cheats: {
        //   where: {
        //     status: 'published',
        //   },
        //   select: {
        //     _count: true,
        //     minimumPrice: true,
        //   },
        // },
      },
    });
  }
}
