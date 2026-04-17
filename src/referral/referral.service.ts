// referral.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateReferralDto, UpdateReferralDto } from './dto';
import { User } from '@prisma/client';

@Injectable()
export class ReferralService {
  constructor(private readonly prisma: PrismaService) { }

  async create(dto: CreateReferralDto) {
    const find = await this.prisma.referral.findFirst({
      where: {
        code: dto.code,
      },
    });
    if (find) {
      return new BadRequestException('This item already have.');
    }
    return this.prisma.referral.create({
      data: {
        code: dto.code || this.generateReferralCode(15),
        owner: dto.owner,
        userAccountEmail: dto.userAccountEmail || '',
        prcentToPrice: dto.prcentToPrice,
        prcentToBalance: dto.prcentToBalance || 0,
        viewsCount: 0,
      } as any,
    });
  }
  generateReferralCode(length = 6) {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
  async delete(id: string) {
    return this.prisma.referral.delete({ where: { id } });
  }
  async getAll(page: number, limit: number) {
    return this.prisma
      .$transaction([
        this.prisma.referral.findMany({
          skip: (page - 1) * limit,
          take: limit,
          include: {
            transactions: true,
          },
        }),
        this.prisma.referral.count(),
      ])
      .then(([data, total]) => ({ data, total }));
  }

  async update(id: string, dto: UpdateReferralDto) {
    if (dto.code) {
      const existing = await this.prisma.referral.findFirst({
        where: {
          code: dto.code,
          NOT: { id },
        },
      });

      if (existing) {
        throw new BadRequestException('Referral code already exists');
      }
    }

    try {
      return await this.prisma.referral.update({
        where: { id },
        data: { ...dto },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new BadRequestException('Referral code already exists');
      }
      throw error;
    }
  }

  async findByOwner(ownerId: string) {
    return this.prisma.referral.findMany({
      where: { owner: ownerId },
      include: { transactions: true },
    });
  }

  async checkCode(code: string) {
    const referral = await this.prisma.referral.findUnique({
      where: { code },
    });
    if (!referral) throw new NotFoundException('Referral not found');
    return referral;
  }

  async resolveCodeForUser(code: string, user: User | null) {
    const referral = await this.prisma.referral.findUnique({
      where: { code },
      select: {
        id: true,
        code: true,
        owner: true,
        userAccountEmail: true,
        prcentToPrice: true,
        prcentToBalance: true,
      },
    });

    if (!referral) {
      return {
        valid: false,
        reason: 'NOT_FOUND',
      };
    }

    if (!user) {
      return {
        valid: true,
        referral,
      };
    }

    const isOwnReferral =
      !!referral.userAccountEmail &&
      referral.userAccountEmail.toLowerCase() === user.email.toLowerCase();

    if (isOwnReferral) {
      return {
        valid: false,
        reason: 'OWN_REFERRAL',
      };
    }

    const alreadyUsedByUser = await this.prisma.transaction.findFirst({
      where: {
        userId: user.id,
        referralId: referral.id,
      },
      select: { id: true },
    });

    if (alreadyUsedByUser) {
      return {
        valid: false,
        reason: 'ALREADY_USED',
      };
    }

    return {
      valid: true,
      referral,
    };
  }

  async incrementViewByCode(code: string) {
    return this.prisma.referral.update({
      where: { code },
      data: {
        viewsCount: { increment: 1 },
      },
    });
  }

  async getById(id: string) {
    return this.prisma.referral.findFirst({
      where: { id },
      include: {
        transactions: true,
      },
    });
  }
}
