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
import { Transaction, User } from '@prisma/client';
import { generatorAfterCheckoutMail } from 'src/mail/generator';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import * as moment from 'moment-timezone';
import axios from 'axios';
import { MailService } from 'src/mail/mail.service';
import * as crypto from 'crypto';

@Injectable()
export class CheckoutService {
  constructor(
    private prisma: PrismaService,
    private smtpService: SmtpService,
    private mail: MailService,
    private readonly httpService: HttpService,
  ) {}
  private merchantId = process.env.FREEKASSA_MERCHANT_ID;
  private secret1 = process.env.FREEKASSA_SECRET_1;
  private secret2 = process.env.FREEKASSA_SECRET_2;

  // TOCHKA
  private async getAccessToken(): Promise<string> {
    try {
      console.log(
        process.env.TOCHKA_CLIENT_ID,
        process.env.TOCHKA_CLIENT_SECRET,
      );
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
      const html = generatorAfterCheckoutMail(transaction);
      this.mail.sendMail(
        transaction.email,
        transaction.userLanguage === 'en' ? 'Checkout Email' : 'Чек-аут Email',
        null,
        html,
      );
    } catch (error) {
      console.log(error);
    }
  }

  async initiatePayment(
    data: CheckoutDto,
    ip: string,
    user: User,
  ): Promise<string> {
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
        },
      });
      // const amountStr = Number(finalPrice).toFixed(2); // "2000.00"
      const signature = crypto
        .createHash('md5')
        .update(
          `${this.merchantId}:${finalPrice}:${this.secret1}:${data.currency}:${orderId}`,
        )
        .digest('hex');

      const payUrl = `https://pay.fk.money?m=${this.merchantId}&oa=${finalPrice}&i=&currency=${data.currency}&em=&phone=&o=${orderId}&pay=PAY&s=${signature}`;
      // await this.handleCallback({
      //   status: 'succeeded',
      //   external_id: transaction.id,
      // });
      return payUrl;
      // return `${process.env.FRONT_URL}/${data.locale}/preview/${transaction.id}`;
      // return response.data.Data.redirectURL;
    } catch (error) {
      console.log(error);
      throw new BadGatewayException(error);
    }
  }

  async handleCallback(data: any) {
    try {
      const { MERCHANT_ORDER_ID } = data;
      const transaction = await this.prisma.transaction.findFirst({
        where: { orderId: MERCHANT_ORDER_ID },
      });
      if (!transaction) {
        return 'UNDEFINED';
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

      await this.sendMail({
        ...transaction,
        codes: checkoutKeyses,
      });
      return 'YES';
    } catch (error) {
      return 'ERROR';
      console.log(error);
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
