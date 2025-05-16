import {
  BadGatewayException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CheckoutDto } from './dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { count } from 'console';
import { SmtpService } from 'src/smtp/smtp.service';

@Injectable()
export class CheckoutService {
  constructor(
    private prisma: PrismaService,
    private smtpService: SmtpService,
  ) {}

  async sendMail(to: string, codes: string[], price: any) {
    try {
      const transporter = await this.smtpService.createTransporter();
      await transporter.sendMail({
        from: `"SMG" <smg@gmail.com>`,
        to,
        subject: 'Checkout Email',
        text: `here is your codes ${codes.join(',')} your checkouted price is ${price}`,
      });
    } catch (error) {
      console.log(error);
    }
  }
  // @ts-ignore
  async checkoutFunction(data: CheckoutDto, ip: string) {
    try {
      const user = await this.prisma.user.findFirst({
        where: { email: data.email },
      });
      const isReseller = await this.prisma.reseller.findFirst({
        where: { email: data.email },
      });
      const cheat = await this.prisma.cheat.findFirst({
        where: { id: data.itemId },
        include: { plan: { include: { [data.type]: true } } },
      });
      const promoCode = data.promo
        ? await this.prisma.promocode.findFirst({
            where: { code: data.promo },
          })
        : null;
      if (!cheat && !cheat.plan[data.type]) {
        throw new NotFoundException('Product not found');
      }
      // @ts-ignore

      const keyses = cheat.plan[data.type].keys;
      if (keyses.length === 0) {
        await this.prisma.cheat.update({
          where: { id: data.itemId },
          data: { status: 'unpublished' },
        });
        throw new NotFoundException('You cannot buy now this product');
      }

      const checkoutKeyses = keyses.slice(0, data.count);

      // @ts-ignore
      let price = cheat.plan[data.type]?.price;

      if (data.promo) {
        if (promoCode && !(promoCode.count >= promoCode.maxActivate)) {
          price =
            // @ts-ignore
            price - (cheat.plan[data.type]?.price / 100) * promoCode.percent;
          await this.prisma.promocode.update({
            where: { code: data.promo },
            data: { count: promoCode.count + 1 },
          });
        }
      }
      if (isReseller) {
        price =
          // @ts-ignore
          price - (cheat.plan[data.type]?.price / 100) * isReseller.prcent;
      }
      // @ts-ignore
      if (cheat.plan[data.type].prcent > 0) {
        // @ts-ignore
        price =
          price -
          // @ts-ignore
          (cheat.plan[data.type]?.price / 100) * cheat.plan[data.type].prcent;
      }

      const transaction = await this.prisma.transaction.create({
        data: {
          email: data.email,
          userId: user?.id || null,
          cheatId: data.itemId, // renamed to cheatId
          type: data.type,
          codes: checkoutKeyses,
          // @ts-ignore
          price: cheat.plan[data.type].price * data.count,
          checkoutedPrice: price * data.count,
          promoCode: promoCode ? promoCode.code : undefined,
          count: data.count,
          ip,
        },
      });
      await this.prisma.period.update({
        where: {
          // @ts-ignore
          id: cheat.plan[data.type].id,
        },
        data: {
          keys: keyses.slice(data.count),
        },
      });
      await this.sendMail(data.email, checkoutKeyses, price * data.count);
      return transaction.id;
    } catch (error) {
      console.log(error);
      throw new BadGatewayException(error);
    }
  }

  async getTransactionPreview(transactionId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id: transactionId },
      include: { cheat: true },
    });
    if (!transaction)
      throw new UnprocessableEntityException('The product already opened');
    await this.prisma.transaction.update({
      where: { id: transactionId },
      data: { isVisited: true },
    });
    if (!transaction.isVisited) return transaction;
    return null;
  }

  async getTransactionsClient(userId: string, page: number, limit: number) {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
      },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        cheat: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const total = await this.prisma.transaction.count({ where: { userId } });
    return {
      data: transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getFilteredTransactions(params: {
    cheatId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const { cheatId, startDate, endDate, page = 1, limit = 10 } = params;

    const where: any = {};

    if (cheatId) {
      where.cheatId = cheatId;
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    } else if (startDate) {
      where.createdAt = {
        gte: startDate,
      };
    } else if (endDate) {
      where.createdAt = {
        lte: endDate,
      };
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        cheat: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const total = await this.prisma.transaction.count({ where });

    return {
      data: transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
