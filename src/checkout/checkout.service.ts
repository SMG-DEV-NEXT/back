import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CheckoutDto } from './dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Transaction, User } from '@prisma/client';
import { generatorAfterCheckoutMail } from 'src/mail/generator';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { MailService } from 'src/mail/mail.service';
import * as crypto from 'crypto';
import axios from 'axios';
import * as FormData from 'form-data';

@Injectable()
export class CheckoutService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private readonly httpService: HttpService,
  ) {}
  async sendMail(transaction: Transaction) {
    try {
      const html = generatorAfterCheckoutMail(transaction);
      this.mail.sendFromAdmin(
        transaction.email,
        transaction.userLanguage === 'en' ? 'Checkout Email' : 'Чек-аут Email',
        null,
        html,
      );
    } catch (error) {
      console.log(error);
    }
  }

  async createPaymentFk(
    orderId: string,
    amount: number,
    currency: string = 'RUB',
    email: string,
    variantPay: number,
  ) {
    const amountStr = currency !== 'RUB' ? amount.toFixed(2) : amount;

    const data = {
      shopId: Number(process.env.FK_SHOP_ID),
      paymentId: orderId,
      amount: amountStr,
      currency,
      description: 'Покупка товара',
      nonce: Date.now(),
      email,
      i: Number(variantPay),
    };
    const sortedKeys = Object.keys(data).sort();
    const signString = sortedKeys.map((k) => data[k]).join('|');

    // 2️⃣ Генерируем подпись HMAC-SHA256
    const signature = crypto
      .createHmac('sha256', process.env.FK_API_KEY)
      .update(signString)
      .digest('hex');

    // 3️⃣ Отправляем POST запрос
    const response = await axios.post('https://api.fk.life/v1/orders/create', {
      ...data,
      signature,
    });
    // 4️⃣ Получаем ссылку на оплату
    const payUrl = response.data?.location;
    return payUrl;
  }

  async createBill({ amount, orderId, currency }) {
    try {
      const form = new FormData();
      form.append('amount', amount);
      form.append('order_id', orderId);
      form.append('description', 'Покупка товара');
      form.append('type', 'normal');
      form.append('shop_id', process.env.PALLY_MAGAZINE_ID);
      form.append('currency_in', currency);
      form.append('custom', '');
      form.append('payer_pays_commission', '1');
      form.append('name', 'Платёж');

      const url = 'https://pal24.pro/api/v1/bill/create';

      const response = await axios.post(url, form, {
        headers: {
          Authorization: `Bearer ${process.env.PALLY_TOKEN}`,
          ...form.getHeaders(), // IMPORTANT!
        },
      });

      return response.data.link_page_url;
    } catch (err) {
      console.log(err.response.data.errors);
    }
  }

  async initiatePayment(
    data: CheckoutDto,
    ip: string,
    user: User,
  ): Promise<any> {
    try {
      const ref = data.ref;
      let refOwner = null;
      const user = await this.prisma.user.findFirst({
        where: { email: data.email },
      });
      let isReseller = await this.prisma.reseller.findFirst({
        where: { email: data.email },
      });

      const planType = data.type as 'day' | 'week' | 'month';

      const cheat = await this.prisma.cheat.findFirst({
        where: { id: data.itemId, isDeleted: false },
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
      const initialPrice = cheat.plan[data.type]?.price;
      if (ref) {
        refOwner = await this.prisma.referral.findFirst({
          where: {
            code: ref,
          },
        });
        if (refOwner && refOwner.prcentToPrice > 0) {
          price -= (initialPrice / 100) * refOwner.prcentToPrice;
        }
      }
      if (promoCode && promoCode.count < promoCode.maxActivate) {
        price -= (initialPrice / 100) * promoCode.percent;
      }

      if (isReseller && isReseller.email === user.email) {
        price -= (initialPrice / 100) * isReseller.prcent;
      } else {
        isReseller = null;
      }

      if (cheat.plan[data.type].prcent > 0) {
        price -= (initialPrice / 100) * cheat.plan[data.type].prcent;
      }

      const finalPrice =
        data.currency === 'USD'
          ? Math.round(price * data.count) / data.usd
          : Math.round(price * data.count); // рубли * кол-во
      // 1. Создаём транзакцию с пометкой "pending"
      // @ts-nocheck
      const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const transaction = await this.prisma.transaction.create({
        data: {
          email: data.email,
          userId: user?.id || null,
          cheatId: data.itemId,
          type: data.type,
          codes: [],
          referralId: refOwner ? refOwner.id : null,
          //@ts-ignore
          reseller: isReseller ? isReseller.name : undefined,
          price:
            data.currency === 'USD'
              ? (cheat.plan[data.type].price * data.count) / data.usd
              : cheat.plan[data.type].price * data.count,
          checkoutedPrice: finalPrice,
          promoCode: promoCode?.code,
          count: data.count,
          ip,
          // @ts-ignore
          status: 'pending',
          userLanguage: data.locale,
          orderId,
          currency: data.currency,
          realPrice: Math.round(price * data.count),
          methodPay: data.methodPay,
        },
      });
      // const amountStr = Number(finalPrice).toFixed(2); // "2000.00"
      // if (process.env.FRONT_URL === 'http://localhost:3000') {
      //   console.log('Development mode: Overriding payUrl to localhost');
      //   await this.handleCallback({
      //     MERCHANT_ORDER_ID: orderId,
      //   });
      //   const payUrl = `http://localhost:3000/${data.locale}?MERCHANT_ORDER_ID=${orderId}`;
      //   return payUrl;
      // }
      let payUrl = '';
      switch (data.methodPay) {
        case 'fk':
          payUrl = await this.createPaymentFk(
            orderId,
            finalPrice,
            data.currency,
            transaction.email,
            data.variantPay,
          );
          break;
        case 'pally':
          payUrl = await this.createBill({
            amount: finalPrice,
            orderId,
            currency: data.currency,
          });
          break;
      }
      // await this.handleCallback({
      //   status: 'succeeded',
      //   external_id: transaction.id,
      // });
      // return `${process.env.FRONT_URL}/${data.locale}/preview/${transaction.id}`;
      // return response.data.Data.redirectURL;
      return payUrl;
    } catch (error) {
      console.log(error);
      if (
        error?.response &&
        error.response?.data &&
        error.response.data?.error
      ) {
        return { error: error.response.data?.error };
      }
      throw new BadGatewayException(error);
    }
  }

  async handleCallback(data: any) {
    try {
      const { MERCHANT_ORDER_ID, InvId, Status } = data;
      let transaction;
      if (InvId && Status === 'SUCCESS') {
        transaction = await this.prisma.transaction.findFirst({
          where: { orderId: InvId },
        });
      } else if (MERCHANT_ORDER_ID) {
        transaction = await this.prisma.transaction.findFirst({
          where: { orderId: MERCHANT_ORDER_ID },
        });
      }
      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }
      const txId = transaction.id;
      //@ts-ignore
      if (transaction.promoCode) {
        await this.prisma.promocode.update({
          where: { code: transaction.promoCode },
          data: {
            count: {
              increment: 1,
            },
          },
        });
      }
      if (transaction.referralId) {
        const referral = await this.prisma.referral.findUnique({
          where: { id: transaction.referralId },
        });

        if (referral) {
          await this.prisma.referral.update({
            where: { id: transaction.referralId },
            data: {
              transactions: {
                connect: { id: transaction.id },
              },
            },
          });
        } else {
          console.warn('Referral not found, skipping connect');
        }
      }
      if (!transaction || transaction.status === 'success') return;

      const cheat = await this.prisma.cheat.findFirst({
        where: { id: transaction.cheatId, isDeleted: false },
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

      await this.sendMail({
        ...transaction,
        codes: checkoutKeyses,
      });
      return 'YES';
    } catch (error) {
      throw new BadGatewayException(error);
    }
  }

  async getTransactionPreview(transactionId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { orderId: transactionId },
      include: { cheat: true },
    });
    if (!transaction)
      throw new UnprocessableEntityException('The product already opened');
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: { isVisited: true },
    });
    // if (!transaction.isVisited) return transaction;
    return null;
  }

  async getTransactionsClient(
    userId: string,
    page: number,
    limit: number,
    email: string,
  ) {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        OR: [{ userId }, { email }],
        status: 'success',
      },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        cheat: {
          include: {
            catalog: {
              select: {
                link: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const total = await this.prisma.transaction.count({
      where: {
        OR: [{ userId }, { email }],
        status: 'success',
      },
    });
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
    search?: string;
    reseller?: boolean;
    referral?: boolean;
    promo?: boolean;
  }) {
    const {
      cheatId,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      search,
      referral,
      reseller,
      promo,
    } = params;

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },

        { ip: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (cheatId) {
      where.cheatId = cheatId;
    }
    if (referral) {
      where.referralId = {
        not: null,
      };
    }
    if (reseller) {
      where.reseller = {
        not: null,
      };
    }
    if (promo) {
      where.promoCode = {
        not: null,
      };
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

  async downloadDocument(id: string) {
    const tr = await this.prisma.transaction.findFirst({
      where: { id },
      include: { user: true, cheat: true },
    });
    return tr;
  }
}
