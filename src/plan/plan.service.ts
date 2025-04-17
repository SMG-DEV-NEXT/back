import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePlanDto, UpdatePlanDto } from './dto';

@Injectable()
export class PlanService {
  constructor(private prisma: PrismaService) {}

  // Create a new plan
  async create(createPlanDto: CreatePlanDto) {
    const periodDay = await this.prisma.period.create({
      data: { keys: [], price: 10, prcent: 5 },
    });

    const periodWeek = await this.prisma.period.create({
      data: { keys: [], price: 50, prcent: 10 },
    });

    const periodMonth = await this.prisma.period.create({
      data: { keys: [], price: 150, prcent: 15 },
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
          keys: day.keys,
          prcent: day.prcent,
          price: day.price,
        },
      });
      await this.prisma.period.update({
        where: { id: week.id },
        data: {
          keys: week.keys,
          prcent: week.prcent,
          price: week.price,
        },
      });
      await this.prisma.period.update({
        where: { id: month.id },
        data: {
          keys: month.keys,
          prcent: month.prcent,
          price: month.price,
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
