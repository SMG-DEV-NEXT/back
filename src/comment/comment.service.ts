import { Injectable } from '@nestjs/common';
import { PlanService } from 'src/plan/plan.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CommentCreate, GetCommentsDto, UpdateComment } from './dto';
import { isNumber } from 'class-validator';
import { User } from '@prisma/client';

@Injectable()
export class CommentService {
  constructor(
    private prisma: PrismaService,
    private planService: PlanService,
  ) {}

  async create(dto: CommentCreate, user: User) {
    return this.prisma.comment.create({
      data: {
        userId: user.id,
        text: dto.text,
        cheatId: dto.cheatId,
        stars: dto.stars,
      },
      include: {
        user: true,
      },
    });
  }
  async getFilteredComments(dto: GetCommentsDto) {
    const {
      cheatTitle,
      userEmail,
      createdFrom,
      createdTo,
      sortBy = 'stars',
      order = 'desc',
      page = '1',
      limit = '10',
    } = dto;

    const where: any = {
      AND: [],
    };

    if (createdFrom !== 'undefined' || createdTo !== 'undefined') {
      const createdAt: any = {};
      if (createdFrom !== 'undefined') createdAt.gte = new Date(createdFrom);
      if (createdTo !== 'undefined') createdAt.lte = new Date(createdTo);

      where.AND.push({ createdAt });
    }

    if (cheatTitle) {
      where.AND.push({
        OR: [
          { cheat: { titleEn: { contains: cheatTitle, mode: 'insensitive' } } },
          { cheat: { titleRu: { contains: cheatTitle, mode: 'insensitive' } } },
        ],
      });
    }

    if (userEmail) {
      where.AND.push({
        user: {
          email: { contains: userEmail, mode: 'insensitive' },
        },
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.comment.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { [sortBy]: order },
        include: {
          user: true,
          cheat: true,
        },
      }),
      this.prisma.comment.count({ where }),
    ]);

    return {
      data,
      total,
      page: parseInt(page),
      pageCount: Math.ceil(total / parseInt(limit)),
    };
  }

  async getComment(id: string) {
    return this.prisma.comment.findFirst({
      where: {
        id,
      },
      include: {
        cheat: {
          include: {
            catalog: true,
          },
        },
        user: true,
      },
    });
  }

  async saveComment(id: string, dto: UpdateComment) {
    return this.prisma.comment.update({
      where: {
        id,
      },
      data: dto,
    });
  }
}
