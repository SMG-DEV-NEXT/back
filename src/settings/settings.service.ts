import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async updateSetting(title: string, settings: any) {
    const existing = await this.prisma.setting.findUnique({ where: { title } });
    if (existing) {
      return this.prisma.setting.update({
        where: { title },
        data: { settings },
      });
    }

    return this.prisma.setting.create({
      data: {
        title,
        settings,
      },
    });
  }

  async getSettingByTitle(title: string) {
    const setting = await this.prisma.setting.findUnique({
      where: { title },
    });

    if (!setting) {
      throw new NotFoundException('Setting not found');
    }

    return setting;
  }

  async getAllSettings() {
    return this.prisma.setting.findMany();
  }
}
