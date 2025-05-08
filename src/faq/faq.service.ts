import { Injectable } from '@nestjs/common';
import { CreateStatDto, UpdateBlockDto } from './dto';
import { UpdateStatDto } from './dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class FaqService {
  constructor(private prisma: PrismaService) {}

  async initBlocks() {
    const blocks = [
      { titleru: 'General Questions', titleen: 'General Questions', order: 0 },
      { titleru: 'General Questions', titleen: 'General Questions', order: 1 },
      { titleru: 'General Questions', titleen: 'General Questions', order: 2 },
    ];

    for (const block of blocks) {
      const exists = await this.prisma.faqBlock.findFirst({
        where: { order: block.order },
      });
      if (!exists) {
        await this.prisma.faqBlock.create({ data: block });
      }
    }

    return { message: 'Blocks initialized' };
  }

  async createStat(dto: CreateStatDto) {
    return this.prisma.faqStat.create({
      data: {
        faqBlockId: dto.faqBlockId,
        type: dto.type,
        content: dto.content,
        data: dto.data,
      },
    });
  }

  async updateStat(id: string, dto: UpdateStatDto) {
    return this.prisma.faqStat.update({
      where: { id },
      data: dto,
    });
  }

  async getStatById(id: string) {
    return this.prisma.faqStat.findUnique({
      where: { id },
    });
  }

  async getAllFaq() {
    return this.prisma.faqBlock.findMany({
      orderBy: { order: 'asc' },
      include: {
        stats: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async getBlockFaq(id: string) {
    return this.prisma.faqBlock.findFirst({
      where: {
        id,
      },
      include: {
        stats: true,
      },
    });
  }

  async updateBlockFaq(id: string, data: UpdateBlockDto) {
    return this.prisma.faqBlock.update({
      where: {
        id,
      },
      data,
    });
  }

  async getAllStats() {
    return this.prisma.faqStat.findMany({
      include: { faqBlock: true },
    });
  }
}
