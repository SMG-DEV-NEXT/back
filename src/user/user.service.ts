import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateUserDto } from './dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllUsers({
    search,
    page,
    limit,
  }: {
    search?: string;
    page: number;
    limit: number;
  }) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where: search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {},
        orderBy: { email: 'desc' },
        include: {
          _count: {
            select: {
              transactions: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({
        where: search
          ? { name: { contains: search, mode: 'insensitive' } }
          : {},
      }),
    ]);
    return { data, total: Math.ceil(total / limit), page, limit };
  }

  getUserProfile(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        transactions: true,
        comments: {
          include: { cheat: true },
        },
      },
    });
  }

  async updateUserProfile(id: string, updateData: UpdateUserDto) {
    const findUser = await this.prisma.user.findUnique({ where: { id } });
    let newPassword = findUser.password;
    if (updateData.password) {
      const hashedPassword = await bcrypt.hash(updateData.password, 10);
      // Hash password before updating
      newPassword = hashedPassword;
    }
    return this.prisma.user.update({
      where: { id },
      data: {
        ...findUser,
        ...updateData,
        password: newPassword,
      },
    });
  }
}
