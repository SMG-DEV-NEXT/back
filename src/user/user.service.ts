import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateUserDto } from './dto';
import * as bcrypt from 'bcryptjs';
import { MailService } from 'src/mail/mail.service';
import { generateRewardVisitedMail } from 'src/mail/generator';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailService,
  ) { }

  private async getActiveReward(userId?: string) {
    if (!userId) return null;

    return (this.prisma as any).reward.findFirst({
      where: {
        userId,
        visited: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  private async getLoyaltyTiers() {
    const setting = await this.prisma.setting.findUnique({
      where: { title: 'loyalty_tiers' },
    });

    const tiers = (setting?.settings as any)?.tiers;
    if (!Array.isArray(tiers)) return [];

    return [...tiers]
      .map((tier) => ({
        minSpent: Number(tier?.minSpent || 0),
        percent: Number(tier?.percent || 0),
      }))
      .filter((tier) => tier.minSpent >= 0 && tier.percent > 0)
      .sort((a, b) => a.minSpent - b.minSpent);
  }

  private resolveUserLoyaltyTier(
    totalSpent: number,
    tiers: Array<{ minSpent: number; percent: number }>,
  ) {
    const normalizedTotalSpent = Number(totalSpent || 0);
    const sortedAsc = [...tiers].sort((a, b) => a.minSpent - b.minSpent);
    const matchedTier = [...sortedAsc]
      .reverse()
      .find((tier) => normalizedTotalSpent >= tier.minSpent);
    const nextTierIndex = sortedAsc.findIndex(
      (tier) => normalizedTotalSpent < tier.minSpent,
    );
    const nextTier = nextTierIndex >= 0 ? sortedAsc[nextTierIndex] : null;

    return {
      totalSpent: normalizedTotalSpent,
      loyaltyPercent: matchedTier?.percent || 0,
      loyaltyMinSpent: matchedTier?.minSpent || 0,
      nextLoyaltyPosition: nextTierIndex >= 0 ? nextTierIndex + 1 : null,
      nextLoyaltyTier: nextTier,
      nextLoyaltyMinSpent: nextTier?.minSpent ?? null,
      nextLoyaltyPercent: nextTier?.percent ?? null,
      nextLoyaltyAmountLeft: nextTier
        ? Math.max(nextTier.minSpent - normalizedTotalSpent, 0)
        : 0,
      isMaxLoyaltyTier: !!sortedAsc.length && !nextTier,
    };
  }

  private async createBalanceHistory(
    userId: string,
    type: string,
    information: Record<string, any>,
  ) {
    return (this.prisma as any).balanceHistory.create({
      data: {
        userId,
        type,
        information: JSON.stringify(information),
      },
    });
  }

  async getAllUsers({
    search,
    page,
    limit,
  }: {
    search?: string;
    page: number;
    limit: number;
  }) {
    const loyaltyTiers = await this.getLoyaltyTiers();

    const where: any = search
      ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }
      : {};

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { email: 'desc' },
        include: {
          transactions: {
            where: { status: 'success' },
          }
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({
        where,
      }),
    ]);

    const mappedData = await Promise.all(data.map(async (user) => {
      const loyaltyData = this.resolveUserLoyaltyTier(
        (user as any).totalSpent || 0,
        loyaltyTiers,
      );
      const [activeReward, rewards] = await Promise.all([
        this.getActiveReward(user.id),
        (this.prisma as any).reward.findMany({
          where: { userId: user.id },
          select: { id: true, visited: true },
        }),
      ]);

      const rewardsCount = rewards.length;
      const visitedRewardsCount = rewards.filter((reward: any) => reward.visited).length;

      return {
        ...user,
        transactionCount: user.transactions.length,
        ...loyaltyData,
        activeReward,
        activePoint: activeReward,
        rewardsCount,
        visitedRewardsCount,
      };
    }));

    return { data: mappedData, total: Math.ceil(total / limit), page, limit };
  }

  async getUserProfile(id: string) {
    const [user, loyaltyTiers] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id },
        include: {
          balanceHistory: {
            orderBy: { createdAt: 'desc' },
          },
          transactions: {
            where: { status: 'success' },
            include: { cheat: true },
          },
          comments: {
            include: { cheat: true },
          },
        },
      }),
      this.getLoyaltyTiers(),
    ]);

    if (!user) return user;

    const loyaltyData = this.resolveUserLoyaltyTier(
      (user as any).totalSpent || 0,
      loyaltyTiers,
    );

    const [activeReward, rewards] = await Promise.all([
      this.getActiveReward(id),
      (this.prisma as any).reward.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return {
      ...user,
      ...loyaltyData,
      rewards,
      activeReward,
      activePoint: activeReward,
    };
  }

  async updateUserProfile(
    id: string,
    updateData: UpdateUserDto,
    clientInfo: Record<string, any> = {},
    adminUser: Record<string, any> = {},
  ) {
    const findUser = await this.prisma.user.findUnique({ where: { id } });
    if (!findUser) throw new NotFoundException('User not found');

    const previousBalance = (findUser as any).balance || 0;
    const nextBalance =
      typeof (updateData as any).balance === 'number'
        ? Number((updateData as any).balance)
        : previousBalance;

    let newPassword = findUser.password;
    if (updateData.password) {
      const hashedPassword = await bcrypt.hash(updateData.password, 10);
      // Hash password before updating
      newPassword = hashedPassword;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        ...updateData,
        password: newPassword,
      },
    });

    if (nextBalance !== previousBalance) {
      const safeUpdateData = {
        ...updateData,
        password: updateData.password ? '[CHANGED]' : undefined,
      };

      await this.createBalanceHistory(id, 'ADMIN_CHANGE', {
        action: 'ADMIN_CHANGE',
        reason: 'USER_PROFILE_UPDATE',
        previousBalance,
        newBalance: nextBalance,
        delta: nextBalance - previousBalance,
        updatedUserId: id,
        updatedUserEmail: findUser.email,
        updatedUserName: findUser.name,
        updatedFields: Object.keys(updateData || {}),
        updateData: safeUpdateData,
        admin: {
          id: adminUser?.id || null,
          email: adminUser?.email || null,
          name: adminUser?.name || null,
          role: adminUser?.role || null,
        },
        clientInfo,
        createdAt: new Date().toISOString(),
      });
    }

    const [activeReward, loyaltyTiers] = await Promise.all([
      this.getActiveReward(id),
      this.getLoyaltyTiers(),
    ]);
    const loyaltyData = this.resolveUserLoyaltyTier(
      (updatedUser as any).totalSpent || 0,
      loyaltyTiers,
    );
    return {
      ...updatedUser,
      ...loyaltyData,
      activeReward,
      activePoint: activeReward,
    };
  }

  async updateUserBalance(
    userId: string,
    newBalance: number,
    clientInfo: Record<string, any> = {},
    adminUser: Record<string, any> = {},
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const previousBalance = (user as any).balance || 0;
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { balance: newBalance } as any,
    });

    await this.createBalanceHistory(userId, 'ADMIN_CHANGE', {
      action: 'ADMIN_CHANGE',
      reason: 'DIRECT_BALANCE_UPDATE',
      previousBalance,
      newBalance,
      delta: newBalance - previousBalance,
      email: user.email,
      name: user.name,
      updateData: {
        balance: newBalance,
      },
      admin: {
        id: adminUser?.id || null,
        email: adminUser?.email || null,
        name: adminUser?.name || null,
        role: adminUser?.role || null,
      },
      clientInfo,
      createdAt: new Date().toISOString(),
    });

    const [activeReward, loyaltyTiers] = await Promise.all([
      this.getActiveReward(userId),
      this.getLoyaltyTiers(),
    ]);
    const loyaltyData = this.resolveUserLoyaltyTier(
      (updatedUser as any).totalSpent || 0,
      loyaltyTiers,
    );
    return {
      ...updatedUser,
      ...loyaltyData,
      activeReward,
      activePoint: activeReward,
    };
  }

  async addReward(
    userId: string,
    information: Record<string, any> = {},
    visited = false,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const reward = await (this.prisma as any).reward.create({
      data: {
        userId,
        visited,
        information,
      },
    });

    const activeReward = await this.getActiveReward(userId);

    return {
      reward,
      activeReward,
      activePoint: activeReward,
    };
  }

  async getUserRewards(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const [rewards, activeReward] = await Promise.all([
      (this.prisma as any).reward.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      this.getActiveReward(userId),
    ]);

    return {
      rewards,
      activeReward,
      activePoint: activeReward,
    };
  }

  async visitReward(userId: string, rewardId: string, lang: 'ru' | 'en' = 'en') {
    const reward = await (this.prisma as any).reward.findFirst({
      where: {
        id: rewardId,
        userId,
      },
    });

    if (!reward) throw new NotFoundException('Reward not found');

    const updatedReward = await (this.prisma as any).reward.update({
      where: { id: rewardId },
      data: { visited: true },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (user?.email) {
      const info = (updatedReward as any)?.information || {};

      await this.mailer.sendFromNoreply(
        user.email,
        lang === 'ru' ? 'Награда открыта' : 'Reward opened',
        null,
        generateRewardVisitedMail(info?.name || '', info?.code || '', lang),
      );
    }

    const activeReward = await this.getActiveReward(userId);

    return {
      reward: updatedReward,
      activeReward,
      activePoint: activeReward,
    };
  }
}
