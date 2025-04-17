import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePromocodeDto, UpdatePromocodeDto } from './dto';

@Injectable()
export class PromocodeService {
  constructor(private prisma: PrismaService) {}

  create(data: CreatePromocodeDto) {
    return this.prisma.promocode.create({ data: { ...data, count: 0 } });
  }

  getAll(page: number, limit: number) {
    return this.prisma
      .$transaction([
        this.prisma.promocode.findMany({
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.promocode.count(),
      ])
      .then(([data, total]) => ({ data, total }));
  }

  getOne(id: string) {
    return this.prisma.promocode.findUnique({ where: { id } });
  }

  update(id: string, data: UpdatePromocodeDto) {
    return this.prisma.promocode.update({
      where: { id },
      data,
    });
  }

  delete(id: string) {
    return this.prisma.promocode.delete({ where: { id } });
  }

  check(code: string) {
    return this.prisma.promocode.findFirst({ where: { code } });
  }
}
