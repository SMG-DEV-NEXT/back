import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateResellerDto, UpdateResellerDto } from './dto';

@Injectable()
export class ResellerService {
  constructor(private prisma: PrismaService) {}

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
}
