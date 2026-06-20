import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePromocodeDto, UpdatePromocodeDto } from './dto';

@Injectable()
export class PromocodeService {
  constructor(private prisma: PrismaService) { }

  private async addPromoToCheats(promoId: string, cheatIds: string[]) {
    for (const cheatId of cheatIds) {
      const cheat: any = await this.prisma.cheat.findUnique({ where: { id: cheatId } });
      const currentPromoIds: string[] = Array.isArray(cheat?.promocodeIds) ? cheat.promocodeIds : [];

      if (!currentPromoIds.includes(promoId)) {
        await this.prisma.cheat.update({
          where: { id: cheatId },
          data: {
            promocodeIds: [...currentPromoIds, promoId],
          },
        } as any);
      }
    }
  }

  private async removePromoFromCheats(promoId: string, cheatIds: string[]) {
    for (const cheatId of cheatIds) {
      const cheat: any = await this.prisma.cheat.findUnique({ where: { id: cheatId } });
      const currentPromoIds: string[] = Array.isArray(cheat?.promocodeIds) ? cheat.promocodeIds : [];
      const nextPromoIds = currentPromoIds.filter((id) => id !== promoId);

      if (nextPromoIds.length !== currentPromoIds.length) {
        await this.prisma.cheat.update({
          where: { id: cheatId },
          data: {
            promocodeIds: nextPromoIds,
          },
        } as any);
      }
    }
  }

  async create(data: CreatePromocodeDto) {
    const { cheats, ...rest } = data;
    const cheatIds: string[] = Array.from(new Set((cheats || []) as string[]));

    const promo = await this.prisma.promocode.create({
      data: {
        ...rest,
        count: 0,
        cheatIds,
      },
    } as any);

    if (cheatIds.length) {
      await this.addPromoToCheats(promo.id, cheatIds);
    }

    return promo;
  }

  getAll(page: number, limit: number) {
    return this.prisma
      .$transaction([
        this.prisma.promocode.findMany({
          skip: (page - 1) * limit,
          take: limit,
          include: {
            cheats: {
              select: {
                id: true,
                titleRu: true,
                titleEn: true,
              },
            },
          },
        } as any),
        this.prisma.promocode.count(),
      ])
      .then(([data, total]) => ({ data, total }));
  }

  getOne(id: string) {
    return this.prisma.promocode.findUnique({
      where: { id },
      include: {
        cheats: {
          select: {
            id: true,
            titleRu: true,
            titleEn: true,
          },
        },
      },
    } as any);
  }

  async update(id: string, data: UpdatePromocodeDto) {
    const { cheats, ...rest } = data as any;
    const cheatIds: string[] = Array.from(new Set((cheats || []) as string[]));

    const existing: any = await this.prisma.promocode.findUnique({ where: { id } });
    const oldCheatIds: string[] = Array.isArray(existing?.cheatIds) ? existing.cheatIds : [];

    const updatedPromo = await this.prisma.promocode.update({
      where: { id },
      data: {
        ...rest,
        ...(cheats !== undefined
          ? {
            cheatIds,
          }
          : {}),
      },
    } as any);

    if (cheats !== undefined) {
      const toAdd = cheatIds.filter((cheatId) => !oldCheatIds.includes(cheatId));
      const toRemove = oldCheatIds.filter((cheatId) => !cheatIds.includes(cheatId));

      if (toAdd.length) {
        await this.addPromoToCheats(id, toAdd);
      }
      if (toRemove.length) {
        await this.removePromoFromCheats(id, toRemove);
      }
    }

    return updatedPromo;
  }

  async delete(id: string) {
    const promo: any = await this.prisma.promocode.findUnique({ where: { id } });
    const cheatIds: string[] = Array.isArray(promo?.cheatIds) ? promo.cheatIds : [];

    if (cheatIds.length) {
      await this.removePromoFromCheats(id, cheatIds);
    }

    return this.prisma.promocode.delete({ where: { id } });
  }

  async check(code: string, cheatId?: string) {
    const promo: any = await this.prisma.promocode.findFirst({
      where: {
        code,
        OR: cheatId
          ? [{ cheatIds: { isEmpty: true } }, { cheatIds: { has: cheatId } }]
          : [{ cheatIds: { isEmpty: true } }],
      },
    });

    if (
      !promo ||
      promo?.count >= promo?.maxActivate ||
      promo?.status === 'inactive'
    ) {
      return { valid: false };
    }
    return promo;
  }
}
