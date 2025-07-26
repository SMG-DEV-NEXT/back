import { BadGatewayException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateResellerDto,
  ResellerRequestDto,
  UpdateResellerDto,
} from './dto';
import { User } from '@prisma/client';
import { TelegramService } from 'src/telegram/telegram.service';

@Injectable()
export class ResellerService {
  constructor(
    private prisma: PrismaService,
    private telegram: TelegramService,
  ) {}

  create(data: CreateResellerDto) {
    return this.prisma.reseller.create({ data });
  }

  findAllPaginated(skip = 0, take = 10) {
    return this.prisma
      .$transaction([
        this.prisma.reseller.findMany({ skip, take }),
        this.prisma.reseller.count(),
      ])
      .then(([data, total]) => ({ data, total }));
  }

  findAllRaw() {
    return this.prisma.reseller.findMany();
  }

  findOne(id: string) {
    return this.prisma.reseller.findUnique({ where: { id } });
  }

  update(id: string, data: UpdateResellerDto) {
    return this.prisma.reseller.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.reseller.delete({ where: { id } });
  }

  check(email: string) {
    return this.prisma.reseller.findFirst({ where: { email } });
  }

  async request(data: ResellerRequestDto) {
    try {
      //@ts-ignore
      const newRequest = await this.prisma.resellerRequest.create({
        data: {
          ...data,
          not: '',
        },
      });
      await this.telegram.sendMessageReseller(data);
      return newRequest;
    } catch (error) {
      throw new BadGatewayException(error);
    }
  }

  async updateRequest(id: string, data: any) {
    try {
      await this.prisma.resellerRequest.update({
        where: { id },
        data: data,
      });
      return true;
    } catch (error) {
      throw new BadGatewayException(error);
    }
  }

  async getAllRequests(skip = 0, take = 10) {
    return this.prisma
      .$transaction([
        this.prisma.resellerRequest.findMany({ skip, take }),
        this.prisma.resellerRequest.count(),
      ])
      .then(([data, total]) => ({ data, total }));
  }

  async removeRequest(id: string) {
    return this.prisma.resellerRequest.delete({
      where: { id },
    });
  }
}
