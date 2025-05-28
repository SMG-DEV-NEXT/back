import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CheckoutDto, CreatePaymentDto } from './dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { count } from 'console';
import { SmtpService } from 'src/smtp/smtp.service';
import { Transaction } from '@prisma/client';
import { generatorAfterCheckoutMail } from 'src/mail/generator';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import * as moment from 'moment-timezone';
import axios from 'axios';

@Injectable()
export class CheckoutService {
  constructor(
    private prisma: PrismaService,
    private smtpService: SmtpService,
    private readonly httpService: HttpService,
  ) {}
  private readonly PAYMENT_URL =
    'https://enter.tochka.com/uapi/payment/v1.0/order';

  // TOCHKA
  private async getAccessToken(): Promise<string> {
    try {
      const data = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.TOCHKA_CLIENT_ID,
        client_secret: process.env.TOCHKA_CLIENT_SECRET,
        scope: 'payments', // 👈 не забудь про scope!
      });

      const response = await firstValueFrom(
        this.httpService.post(
          'https://enter.tochka.com/connect/token',
          data.toString(), // обязательно .toString()!
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      return response.data.access_token;
    } catch (error) {
      console.log(error);
      throw new BadGatewayException(error);
    }
  }

  async sendMail(transaction: Transaction) {
    try {
      const transporter = await this.smtpService.createTransporter();
      const html = generatorAfterCheckoutMail(transaction);
      await transporter.sendMail({
        from: `"SMG" <smg@gmail.com>`,
        to: transaction.email,
        subject: 'Checkout Email',
        html,
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
          status: 'pending',
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
      await this.sendMail(transaction);
      return transaction.id;
    } catch (error) {
      console.log(error);
      throw new BadGatewayException(error);
    }
  }

  async initiatePayment(data: CheckoutDto, ip: string): Promise<string> {
    try {
      const user = await this.prisma.user.findFirst({
        where: { email: data.email },
      });
      const isReseller = await this.prisma.reseller.findFirst({
        where: { email: data.email },
      });
      const planType = data.type as 'day' | 'week' | 'month';

      const cheat = await this.prisma.cheat.findFirst({
        where: { id: data.itemId },
        include: { plan: { include: { day: true, month: true, week: true } } },
      });
      const promoCode = data.promo
        ? await this.prisma.promocode.findFirst({ where: { code: data.promo } })
        : null;

      if (!cheat || !cheat.plan[data.type])
        throw new NotFoundException('Product not found');

      const keyses = cheat.plan[planType].keys;
      if (keyses.length < data.count)
        throw new BadRequestException('Недостаточно ключей');
      let price = cheat.plan[data.type]?.price;

      if (promoCode && promoCode.count < promoCode.maxActivate) {
        price -= (price / 100) * promoCode.percent;
      }

      if (isReseller) {
        price -= (price / 100) * isReseller.prcent;
      }

      if (cheat.plan[data.type].prcent > 0) {
        price -=
          (cheat.plan[data.type].price / 100) * cheat.plan[data.type].prcent;
      }

      const finalPrice = Math.round(price * data.count); // рубли * кол-во

      // 1. Создаём транзакцию с пометкой "pending"
      // @ts-nocheck
      const transaction = await this.prisma.transaction.create({
        data: {
          email: data.email,
          userId: user?.id || null,
          cheatId: data.itemId,
          type: data.type,
          codes: [],
          price: cheat.plan[data.type].price * data.count,
          checkoutedPrice: finalPrice,
          promoCode: promoCode?.code,
          count: data.count,
          ip,
          // @ts-ignore
          status: 'pending',
        },
      });

      // 2. Генерация ссылки через API Точки
      const token = await this.getAccessToken();
      console.log(finalPrice * 100);
      const paymentPayload = {
        Data: {
          accountCode: '614502280376', // ваш счёт в Точке
          bankCode: '044525104', // БИК Точки

          counterpartyBankBic: '044525104',
          counterpartyAccountNumber: '614502280376',
          counterpartyName: 'ООО SMG',
          // counterpartyBankCorrAccount: '30101810745374525104',

          paymentAmount: finalPrice * 100,
          paymentDate: moment().tz('Europe/Moscow').format('YYYY-MM-DD'),
          paymentNumber: transaction.id,
          paymentPriority: '5',
          paymentPurpose: `Покупка чита: ${cheat[`title${data.locale === 'ru' ? 'Ru' : 'En'}`]}`,
        },
      };
      const response = await axios.post(this.PAYMENT_URL, paymentPayload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data.Data.redirectURL;
    } catch (error) {
      console.log(error);
      throw new BadGatewayException(error);
    }
  }

  async handleCallback(data: any) {
    const txId = data.external_id;
    const status = data.status; // должно быть 'succeeded'

    if (status !== 'succeeded') return;

    const transaction = await this.prisma.transaction.findUnique({
      where: { id: txId },
    });
    //@ts-ignore
    if (!transaction || transaction.status === 'success') return;

    const cheat = await this.prisma.cheat.findFirst({
      where: { id: transaction.cheatId },
      include: { plan: { include: { [transaction.type]: true } } },
    });

    const plan = cheat.plan[transaction.type];
    //@ts-ignore
    const keyses = plan.keys;

    if (keyses.length < transaction.count) {
      await this.prisma.transaction.update({
        where: { id: txId },
        //@ts-ignore
        data: { status: 'error' },
      });
      return;
    }

    const checkoutKeyses = keyses.slice(0, transaction.count);

    await this.prisma.transaction.update({
      where: { id: txId },
      data: {
        //@ts-ignore
        status: 'success',
        codes: checkoutKeyses,
      },
    });
    await this.prisma.period.update({
      //@ts-ignore
      where: { id: plan.id },
      data: {
        keys: keyses.slice(transaction.count),
      },
    });

    await this.sendMail(transaction);
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
