// referral.service.ts
import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateReferralDto, UpdateReferralDto } from './dto';
import { MongoInvalidArgumentError } from 'mongodb';

@Injectable()
export class ReferralService {
  constructor(private readonly prisma: PrismaService) {}

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
        prcentToPrice: dto.prcentToPrice,
        viewsCount: 0,
      },
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
    return this.prisma.referral.update({
      where: { id },
      data: { ...dto },
    });
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
