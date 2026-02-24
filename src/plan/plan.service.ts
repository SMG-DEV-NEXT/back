import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePlanDto, UpdatePlanDto } from './dto';

@Injectable()
export class PlanService {
  constructor(private prisma: PrismaService) { }

  // Create a new plan
  async create(createPlanDto: CreatePlanDto) {
    const periodDay = await this.prisma.period.create({
      data: { keys: [], price: 0, prcent: 0, titleRu: "1 дней", titleEn: "1 days" },
    });

    const periodWeek = await this.prisma.period.create({
      data: { keys: [], price: 0, prcent: 0, titleRu: "7 дней", titleEn: "7 days" },
    });

    const periodMonth = await this.prisma.period.create({
      data: { keys: [], price: 0, prcent: 0, titleRu: "30 дней", titleEn: "30 days" },
    });

    return this.prisma.plan.create({
      data: {
        ...createPlanDto,
        // dayId: periodDay.id,
        // weekId:periodWeek.id,
        // monthId:periodMonth.id,
        cheat: {
          connect: { id: createPlanDto.cheatId },
        },
        day: {
          connect: { id: periodDay.id },
        },
        month: {
          connect: { id: periodMonth.id },
        },
        week: {
          connect: { id: periodWeek.id },
        },
      },
    });
  }

  // Get all plans
  async getAll() {
    return this.prisma.plan.findMany({
      include: {
        cheat: true,
      },
    });
  }

  // Get a plan by its ID
  async getById(id: string) {
    return this.prisma.plan.findUnique({
      where: { id },
      include: {
        day: true,
        week: true,
        month: true,
        cheat: {
          select: {
            titleRu: true,
            titleEn: true,
          },
        },
      },
    });
  }

  // Update a plan
  async update(id: string, updatePlanDto: UpdatePlanDto) {
    try {
      const day = updatePlanDto.day;
      const week = updatePlanDto.week;
      const month = updatePlanDto.month;
      await this.prisma.period.update({
        where: { id: day.id },
        data: {
          keys: day.keys.filter((e) => e.length > 0),
          prcent: day.prcent,
          price: day.price,
          titleRu: day.titleRu,
          titleEn: day.titleEn,
        },
      });
      await this.prisma.period.update({
        where: { id: week.id },
        data: {
          keys: week.keys.filter((e) => e.length > 0),
          prcent: week.prcent,
          price: week.price,
          titleRu: week.titleRu,
          titleEn: week.titleEn,
        },
      });
      await this.prisma.period.update({
        where: { id: month.id },
        data: {
          keys: month.keys.filter((e) => e.length > 0),
          prcent: month.prcent,
          price: month.price,
          titleRu: month.titleRu,
          titleEn: month.titleEn,
        },
      });
      return true;
    } catch (er) {
      console.log(er);
      throw new Error(er);
    }
    // return this.prisma.plan.update({
    //   where: { id },
    //   data: updatePlanDto,
    // });
  }

  // Delete a plan by ID
  async delete(id: string) {
    return this.prisma.plan.delete({
      where: { id },
    });
  }
}
