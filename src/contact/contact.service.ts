import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateContactDto, UpdateContactDto } from './dto';

@Injectable()
export class ContactService {
  constructor(private prisma: PrismaService) {}

  create(data: CreateContactDto) {
    return this.prisma.contact.create({ data });
  }

  update(id: string, data: UpdateContactDto) {
    return this.prisma.contact.update({
      where: { id },
      data,
    });
  }

  getAll() {
    return this.prisma.contact.findMany();
  }

  delete(id: string) {
    return this.prisma.contact.delete({
      where: { id },
    });
  }

  getContact(id: string) {
    return this.prisma.contact.findFirst({
      where: { id },
    });
  }
}
