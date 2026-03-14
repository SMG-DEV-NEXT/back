import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateUserDto } from './dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) { }

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
    return { data, total: Math.ceil(total / limit), page, limit };
  }

  getUserProfile(id: string) {
    return this.prisma.user.findUnique({
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
    });
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

    return updatedUser;
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

    return updatedUser;
  }
}
