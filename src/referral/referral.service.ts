// referral.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
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
    if (dto.userAccountEmail) {
      const ownerExists = await this.prisma.user.findFirst({
        where: { email: dto.userAccountEmail },
      });
      if (!ownerExists) {
        throw new BadRequestException('user_not_found');
      }
    }
    if (find) {
      throw new BadRequestException('This item already have.');
    }
    return this.prisma.referral.create({
      data: {
        code: dto.code || this.generateReferralCode(15),
        owner: dto.owner,
        userAccountEmail: dto.userAccountEmail || '',
        prcentToPrice: dto.prcentToPrice,
        prcentToBalance: dto.prcentToBalance || 0,
        viewsCount: 0,
        isAccumulating: dto.isAccumulating || false,
      } as any,
    });
  }
  generateReferralCode(length = 6) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const bytes = crypto.randomBytes(length);
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars[bytes[i] % chars.length];
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
      if (dto.userAccountEmail) {
        const ownerExists = await this.prisma.user.findFirst({
          where: { email: dto.userAccountEmail },
        });
        if (!ownerExists) {
          throw new BadRequestException('user_not_found');
        }
      }
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

  async resolveCodeForUser(code: string, user: User | null, isAlreadyResolved: Boolean) {
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
      // Check if it's a user personal referral code
      const referralOwnerUser = await (this.prisma as any).user.findFirst({
        where: { referralCode: code } as any,
        select: { id: true, name: true, referralCode: true },
      });

      if (!referralOwnerUser) {
        return { valid: false, reason: 'NOT_FOUND' };
      }

      // Can't use own code
      if (user && (user as any).referralCode === code) {
        return { valid: false, reason: 'OWN_REFERRAL' };
      }

      return {
        valid: true,
        referral: {
          id: null,
          code,
          owner: referralOwnerUser.name,
          prcentToPrice: 5,
          prcentToBalance: 5,
        },
      };
    }

    if (!isAlreadyResolved) await this.incrementViewByCode(code);

    if (!user) {
      const { userAccountEmail: _email, ...safeReferral } = referral;
      return { valid: true, referral: safeReferral };
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

    const { userAccountEmail: _email, ...safeReferral } = referral;
    return { valid: true, referral: safeReferral };
  }

  async incrementViewByCode(code: string) {
    return this.prisma.referral.updateMany({
      where: { code },
      data: { viewsCount: { increment: 1 } },
    });
  }

  async getById(id: string) {
    return this.prisma.referral.findFirst({
      where: { id },
      include: {
        transactions: {
          include: {
            cheat: {
              include: {
                catalog: {
                  select: {
                    link: true,
                    title: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
  }

  async getUserReferrals(page: number, limit: number) {
    const users = await (this.prisma as any).user.findMany({
      where: { referralCode: { not: null } } as any,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        referralCode: true,
        referredByCode: true,
        referralBonusPaid: true,
        createdAt: true,
        balance: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const total = await (this.prisma as any).user.count({
      where: { referralCode: { not: null } } as any,
    });

    // For each user, count how many users they referred and how many of those purchased
    const enriched = await Promise.all(
      users.map(async (user: any) => {
        const referredUsers = await (this.prisma as any).user.findMany({
          where: { referredByCode: user.referralCode } as any,
          select: { id: true, email: true, referralBonusPaid: true },
        });

        const referredUserIds = referredUsers.map((u: any) => u.id);

        let purchasedCount = 0;
        if (referredUserIds.length > 0) {
          purchasedCount = await this.prisma.transaction.count({
            where: {
              userId: { in: referredUserIds },
              status: 'success',
            },
          });
        }

        return {
          ...user,
          referredCount: referredUsers.length,
          referredPurchasedCount: purchasedCount,
        };
      }),
    );

    return { data: enriched, total };
  }

  async getReferralMetrics(referralCode: string) {
    // Works for both admin referrals (in Referral table) and user referrals (user.referralCode)
    const referredUsers = await (this.prisma as any).user.findMany({
      where: { referredByCode: referralCode } as any,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        referralBonusPaid: true,
      },
    });

    const referredUserIds = referredUsers.map((u: any) => u.id);

    const purchasedUsers: string[] = [];
    let transactions: any[] = [];

    if (referredUserIds.length > 0) {
      transactions = await this.prisma.transaction.findMany({
        where: { userId: { in: referredUserIds }, status: 'success' },
        select: { userId: true, realPrice: true, createdAt: true, id: true },
        orderBy: { createdAt: 'desc' },
      });

      const uniqueBuyers = new Set(transactions.map((t) => t.userId));
      purchasedUsers.push(...Array.from(uniqueBuyers));
    }

    return {
      referralCode,
      registeredCount: referredUsers.length,
      purchasedCount: purchasedUsers.length,
      totalRevenue: transactions.reduce((sum, t) => sum + Number(t.realPrice || 0), 0),
      referredUsers,
      transactions,
    };
  }
}
