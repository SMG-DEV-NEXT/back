import { Injectable } from '@nestjs/common';
import { PlanService } from 'src/plan/plan.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCheatDto, GetCheatsDto } from './dto';
import { isNumber } from 'class-validator';

@Injectable()
export class CheatService {
  fields = {
    id: true,
    price: true,
    prcent: true,
  };
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
      await this.shiftPositions(createCheatDto.position);
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
    return this.prisma.cheat.findMany();
  }

  async getAllWithPlans(id: string) {
    return this.prisma.cheat.findMany({
      where: { catalogId: id },
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
      where: { id },
      include: {
        catalog: true,
      },
    });
  }

  async getCheatView(id: string) {
    const cheat = await this.prisma.cheat.findFirst({
      where: {
        id,
      },
      include: {
        comments: {
          include: {
            user: true,
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
    const dayCount = cheat.plan.day?.keys.length;
    const weekCount = cheat.plan.week?.keys.length;
    const monthCount = cheat.plan.month?.keys.length;
    delete cheat.plan.day?.keys;
    delete cheat.plan.week?.keys;
    delete cheat.plan.month?.keys;

    return {
      ...cheat,
      dayCount,
      weekCount,
      monthCount,
    };
  }

  // Update a cheat
  async update(id: string, updateCheatDto: any) {
    const existingCheat = await this.prisma.cheat.findUnique({
      where: { id },
    });
    if (
      updateCheatDto.position !== existingCheat.position &&
      isNumber(updateCheatDto.position)
    ) {
      await this.shiftPositions(existingCheat.position);
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
    await this.prisma.plan.deleteMany({
      where: { cheatId: id },
    });
    await this.prisma.cheat.delete({
      where: { id },
    });
    return { message: id };
  }

  // Delete multiple cheats by IDs
  async deleteMany(ids: string[]) {
    await this.prisma.cheat.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
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

  async apiCheats(dto: GetCheatsDto) {
    const { search, page, limit, type, price_end, price_start } = dto;
    const skip = (page - 1) * limit;

    const [data, catalog] = await Promise.all([
      this.prisma.cheat.findMany({
        where: {
          catalogId: dto.catalogId,
          OR: [
            { titleEn: { contains: search, mode: 'insensitive' } },
            { titleRu: { contains: search, mode: 'insensitive' } },
          ],
        },
        include: {
          comments: true,
          plan: {
            include: {
              day: {
                select: this.fields,
              },
              month: {
                select: this.fields,
              },
            },
          },
        },
        orderBy: {
          position: 'desc',
        },
      }),
      this.prisma.catalog.findFirst({ where: { id: dto.catalogId } }),
    ]);
    let cheats = data;

    // sorting

    // filter if selected price range
    if (price_end >= 0 && price_start >= 0) {
      cheats = cheats.filter((e) => {
        return (
          (e?.plan?.day?.price || 0) >= price_start &&
          (e?.plan?.day?.price || 0) <= price_end
        );
      });
    }

    if (type === 'high_price') {
      cheats = cheats.sort(
        (a, b) => (b.plan?.day?.price || 0) - (a.plan?.day?.price || 0),
      );
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
    } else {
      cheats = cheats.sort(
        (a, b) => (a.plan?.day?.price || 0) - (b.plan?.day?.price || 0),
      );
    }
    // max and min price info
    const prices = [];
    const SortingDataForLimits = data.sort(
      (a, b) => (a.plan?.day?.price || 0) - (b.plan?.day?.price || 0),
    );
    prices.push(SortingDataForLimits[0]?.plan?.day?.price || 0);
    prices.push(SortingDataForLimits.at(-1)?.plan?.day?.price || 0);
    prices.sort((a, b) => a - b);
    const allCheats = cheats.slice(skip, skip + limit); // for pagination

    return {
      total: Math.ceil(cheats.length / limit),
      page,
      limit,
      data: allCheats,
      lowPrice: prices[0],
      maxPrice: prices[1],
      hideFilterBar: data.length < 2,
      catalog,
    };
  }

  async getTopCheats() {
    return this.prisma.cheat.findMany({
      take: 6,
      orderBy: {
        position: 'desc',
      },
    });
  }
}
