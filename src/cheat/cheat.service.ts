import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlanService } from 'src/plan/plan.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCheatDto, GetCheatsDto, GetStatusCheatsDto } from './dto';
import { isNumber } from 'class-validator';
import { User } from '@prisma/client';

@Injectable()
export class CheatService {
  fields = {
    id: true,
    price: true,
    prcent: true,
    keys: true,
  };
  END_STATUSES = ['detected', 'update', 'freeze'];
  constructor(
    private prisma: PrismaService,
    private planService: PlanService,
  ) {}

  // Create a new cheat
  async create(createCheatDto: any) {
    let isCreatedCheatWithPlanIdNull = false;
    let cheatId = null;
    try {
      const { catalogId, ...data } = createCheatDto;
      await this.shiftPositions(createCheatDto.position);
      const cheat = await this.prisma.cheat.create({
        data: {
          ...data,
          catalog: {
            connect: { id: catalogId },
          },
        },
      });
      isCreatedCheatWithPlanIdNull = true;
      cheatId = cheat.id;
      const plan = await this.planService.create({
        cheatId: cheat.id,
      });
      isCreatedCheatWithPlanIdNull = false;
      return { cheat, plan };
    } catch (error) {
      console.log(error);
      if (isCreatedCheatWithPlanIdNull) {
        await this.prisma.cheat.delete({
          where: { id: cheatId },
        });
      }
      throw new Error('Missing ');
    }
  }

  // Get all cheats
  async getAll() {
    return this.prisma.cheat.findMany({
      orderBy: {
        position: 'desc',
      },
      where: {
        isDeleted: false,
      },
      include: { catalog: true },
    });
  }

  async searchCheat(search: string) {
    return this.prisma.cheat.findMany({
      where: {
        status: 'published',
        isDeleted: false,
        OR: [
          { titleEn: { contains: search, mode: 'insensitive' } },
          { titleRu: { contains: search, mode: 'insensitive' } },
          { aboutEn: { contains: search, mode: 'insensitive' } },
          { aboutRu: { contains: search, mode: 'insensitive' } },
        ],
      },
      include: {
        catalog: {
          select: {
            link: true,
          },
        },
      },
    });
  }

  async getAllWithPlans(id: string) {
    return this.prisma.cheat.findMany({
      where: { catalogId: id, isDeleted: false },
      include: {
        plan: {
          include: {
            day: true,
            month: true,
            week: true,
          },
        },
      },
    });
  }

  // Get a cheat by its ID
  async getById(id: string) {
    return this.prisma.cheat.findUnique({
      where: { id, isDeleted: false },
      include: {
        catalog: true,
      },
    });
  }

  async getCheatView(id: string, ref: any, user: User) {
    let refUser = null;

    const cheat = await this.prisma.cheat.findFirst({
      where: {
        link: id,
        status: 'published',
        isDeleted: false,
      },
      include: {
        comments: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
        plan: {
          include: {
            day: true,
            month: true,
            week: true,
          },
        },
        catalog: true,
      },
    });
    if (!cheat) {
      throw new NotFoundException('Cheat not found');
    }
    if (ref) {
      refUser = await this.prisma.referral.findFirst({
        where: { code: ref },
        select: {
          prcentToPrice: true,
          owner: true,
        },
      });
      if (refUser) {
        await this.prisma.referral.update({
          where: {
            code: ref,
          },
          data: {
            viewsCount: {
              increment: 1,
            },
          },
        });
      }
    }
    const dayCount = cheat.plan.day?.keys.length;
    const weekCount = cheat.plan.week?.keys.length;
    const monthCount = cheat.plan.month?.keys.length;
    delete cheat.plan.day?.keys;
    delete cheat.plan.week?.keys;
    delete cheat.plan.month?.keys;
    if (user) {
      const commentAccess = await this.prisma.transaction.findFirst({
        where: {
          cheatId: cheat.id,
          OR: [{ userId: user.id }, { email: user.email }],
        },
      });
      return {
        ...cheat,
        dayCount,
        weekCount,
        monthCount,
        refUser,
        commentAccess: !!commentAccess,
      };
    }

    return {
      ...cheat,
      dayCount,
      weekCount,
      monthCount,
      refUser,
      commentAccess: false,
    };
  }

  // Update a cheat
  async update(id: string, updateCheatDto: any) {
    const existingCheat = await this.prisma.cheat.findUnique({
      where: { id, isDeleted: false },
    });
    if (!existingCheat) {
      throw new NotFoundException('Cheat not found');
    }
    if (
      updateCheatDto.position &&
      updateCheatDto.position !== existingCheat.position
    ) {
      if (updateCheatDto.position > existingCheat.position) {
        // Moving DOWN → shift those between old+1 and new down by 1
        await this.prisma.cheat.updateMany({
          where: {
            position: {
              gt: existingCheat.position,
              lte: updateCheatDto.position,
            },
          },
          data: {
            position: {
              decrement: 1,
            },
          },
        });
      } else {
        // Moving UP → shift those between new and old-1 up by 1
        await this.prisma.cheat.updateMany({
          where: {
            position: {
              gte: updateCheatDto.position,
              lt: existingCheat.position,
            },
          },
          data: {
            position: {
              increment: 1,
            },
          },
        });
      }
    }
    return this.prisma.cheat.update({
      where: { id },
      data: updateCheatDto,
    });
  }

  // Delete a cheat by ID
  async delete(id: string) {
    const e = await this.prisma.plan.findMany({
      where: { cheatId: id },
    });
    // const existingTransactions = await this.prisma.transaction.findFirst({
    //   where: {
    //     cheatId: id,
    //   },
    // });

    // if (existingTransactions) {
    //   throw new BadRequestException(
    //     'The Cheat cannot be deleted because it has transactions.',
    //   );
    // }
    await this.prisma.plan.deleteMany({
      where: { cheatId: id },
    });
    await this.prisma.cheat.update({
      where: { id },
      data: { isDeleted: true },
    });
    await this.prisma.comment.deleteMany({
      where: { cheatId: id },
    });
    return { message: id };
  }

  // Delete multiple cheats by IDs
  async deleteMany(ids: string[]) {
    const existingTransactions = await this.prisma.transaction.findFirst({
      where: {
        cheatId: {
          in: ids,
        },
      },
    });

    if (existingTransactions) {
      throw new BadRequestException(
        'The Cheat cannot be deleted because it has transactions.',
      );
    }
    await this.prisma.cheat.updateMany({
      where: {
        id: {
          in: ids,
        },
      },
      data: { isDeleted: true },
    });
    await this.prisma.plan.deleteMany({
      where: {
        cheatId: {
          in: ids,
        },
      },
    });
    return true;
  }

  private async shiftPositions(position: number) {
    await this.prisma.$transaction([
      this.prisma.cheat.updateMany({
        where: { position: { gte: position } },
        data: { position: { increment: 1 } },
      }),
    ]);
  }

  sortingCheats = (items: Array<any>) =>
    items.sort((a, b) => {
      const aEnd = this.END_STATUSES.includes(a.status);
      const bEnd = this.END_STATUSES.includes(b.status);

      // Items with end-status go last
      if (aEnd && !bEnd) return 1;
      if (!aEnd && bEnd) return -1;

      return 0; // keep original order inside same group
    });

  async apiCheats(dto: GetCheatsDto) {
    const {
      search,
      page: p,
      limit: l,
      type,
      price_end,
      price_start,
      catalogId,
    } = dto;

    const page = p * 1;
    const limit = l * 1;
    const skip = (page - 1) * limit;

    const [data, catalog] = await Promise.all([
      this.prisma.cheat.findMany({
        where: {
          status: 'published',
          isDeleted: false,
          catalog: {
            link: catalogId,
          },
          OR: [
            { titleEn: { contains: search, mode: 'insensitive' } },
            { titleRu: { contains: search, mode: 'insensitive' } },
          ],
        },
        include: {
          comments: true,
          plan: {
            include: {
              day: { select: this.fields },
              week: { select: this.fields },
              month: { select: this.fields },
            },
          },
        },
        orderBy: {
          position: 'desc',
        },
      }),
      this.prisma.catalog.findFirst({
        where: { link: dto.catalogId, isDeleted: false },
      }),
    ]);

    // Map and calculate comparable price
    let cheats = data.map((cheat) => {
      const dayPrice = cheat.plan?.day;
      const weekPrice = cheat.plan?.week;
      const monthPrice = cheat.plan?.month;

      const prices = [dayPrice, weekPrice, monthPrice]
        .filter(
          (p) =>
            typeof p?.price === 'number' && p?.price >= 0 && p?.keys.length > 0,
        )
        .map((e) => e.price);
      // use lowest price among all plans
      const comparablePrice = prices.length > 0 ? Math.min(...prices) : 0;

      return {
        ...cheat,
        _comparePrice: comparablePrice,
        plan: cheat.plan
          ? {
              ...cheat.plan,
              day: {
                id: cheat.plan.day?.id,
                price: cheat.plan.day?.price,
                prcent: cheat.plan.day?.prcent,
                keysCount: cheat.plan.day?.keys?.length || 0,
              },
              week: {
                id: cheat.plan.week?.id,
                price: cheat.plan.week?.price,
                prcent: cheat.plan.week?.prcent,
                keysCount: cheat.plan.week?.keys?.length || 0,
              },
              month: {
                id: cheat.plan.month?.id,
                price: cheat.plan.month?.price,
                prcent: cheat.plan.month?.prcent,
                keysCount: cheat.plan.month?.keys?.length || 0,
              },
            }
          : null,
      };
    });

    // filter by price range
    if (price_start >= 0 && price_end >= 0) {
      cheats = cheats.filter((e) => {
        return e._comparePrice >= price_start && e._comparePrice <= price_end;
      });
    }

    // sorting
    if (type === 'high_price') {
      cheats.sort((a, b) => b._comparePrice - a._comparePrice);
    } else if (type === 'raiting') {
      const cheatsWithRating = cheats.map((cheat) => {
        const starsArray = cheat.comments.map((c) => c.stars);
        const average =
          starsArray.length > 0
            ? starsArray.reduce((a, b) => a + b, 0) / starsArray.length
            : 0;

        return {
          ...cheat,
          rating: average,
        };
      });

      cheats = cheatsWithRating.sort((a, b) => b.rating - a.rating);
    } else if (type === 'popular') {
      cheats = cheats.sort((a, b) => a.position - b.position);
    } else {
      // low → high price
      cheats.sort((a, b) => a._comparePrice - b._comparePrice);
    }

    // collect min/max prices for filter UI
    const prices = new Set<number>();
    data.forEach((cheat) => {
      const day = cheat.plan?.day;
      const week = cheat.plan?.week;
      const month = cheat.plan?.month;

      if (day?.keys?.length > 0) prices.add(day.price);
      if (week?.keys?.length > 0) prices.add(week.price);
      if (month?.keys?.length > 0) prices.add(month.price);
    });

    const SortingDataForLimits = [...prices].sort((a, b) => a - b);
    const minPrice = SortingDataForLimits[0];
    const maxPrice = SortingDataForLimits[SortingDataForLimits.length - 1];

    const paginated = this.sortingCheats(cheats).slice(skip, skip + limit);

    return {
      total: Math.ceil(cheats.length / limit),
      page,
      limit,
      data: paginated,
      lowPrice: minPrice,
      maxPrice: maxPrice,
      hideFilterBar: data.length < 2,
      catalog,
    };
  }

  async getTopCheats() {
    return this.prisma.cheat.findMany({
      take: 6,
      where: {
        isDeleted: false,
        status: 'published',
      },
      orderBy: {
        position: 'desc',
      },
    });
  }

  async getCheatStatusPageData(filters: GetStatusCheatsDto) {
    const search = filters.search;
    const catalog = filters.catalog;
    let data = [];
    const allCatalogs = await this.prisma.catalog.findMany({
      where: {
        type: 'published',
        isDeleted: false,
      },
      select: {
        title: true,
        link: true,
      },
    });
    if (filters.type === 'all') {
      data = await this.prisma.cheat.findMany({
        where: {
          isDeleted: false,
          status: 'published',
          ...(catalog !== 'all'
            ? { catalog: { link: catalog } } // if catalog exists → filter by link
            : {}),
          OR: [
            { titleEn: { contains: search, mode: 'insensitive' } },
            { titleRu: { contains: search, mode: 'insensitive' } },
            { aboutEn: { contains: search, mode: 'insensitive' } },
            { aboutRu: { contains: search, mode: 'insensitive' } },
          ],
        },
        select: {
          titleEn: true,
          titleRu: true,
          updatedAt: true,
          imageUrl: true,
          visibility: true,
          type: true,
          link: true,
          image1: true,
          catalog: {
            select: {
              link: true,
              title: true,
            },
          },
        },
      });
    } else {
      data = await this.prisma.cheat.findMany({
        where: {
          status: 'published',
          isDeleted: false,
          visibility: filters.type,
          ...(catalog !== 'all'
            ? { catalog: { link: catalog } } // if catalog exists → filter by link
            : {}),
          OR: [
            { titleEn: { contains: search, mode: 'insensitive' } },
            { titleRu: { contains: search, mode: 'insensitive' } },
            { aboutEn: { contains: search, mode: 'insensitive' } },
            { aboutRu: { contains: search, mode: 'insensitive' } },
          ],
        },
        select: {
          titleEn: true,
          type: true,
          titleRu: true,
          updatedAt: true,
          imageUrl: true,
          visibility: true,
          link: true,
          image1: true,
          catalog: {
            select: {
              link: true,
              title: true,
            },
          },
        },
      });
    }
    return { data, allCatalogs };
  }
}
