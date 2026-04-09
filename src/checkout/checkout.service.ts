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
  private b2payJwtToken: string | null = null;
  private b2payJwtExpiresAt = 0;
  private b2payAuthLockedUntil = 0;

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private readonly httpService: HttpService,
  ) { }

  private async getB2PayJwtToken(): Promise<string> {
    const now = Date.now();
    if (this.b2payJwtToken && now < this.b2payJwtExpiresAt - 60_000) {
      return this.b2payJwtToken;
    }

    if (now < this.b2payAuthLockedUntil) {
      const secondsLeft = Math.ceil((this.b2payAuthLockedUntil - now) / 1000);
      throw new BadGatewayException(
        `B2Pay auth is temporarily locked. Retry in ${secondsLeft}s`,
      );
    }

    const staticJwtToken = process.env.B2PAY_JWT_TOKEN;
    if (staticJwtToken) {
      return staticJwtToken;
    }

    const tokenUrl = 'https://app.b2pay.online/v1/auth/token/get';

    const tokenExpiryHours = Math.min(
      Number(process.env.B2PAY_TOKEN_EXPIRY_HOURS || 24),
      720,
    );

    const userId = process.env.B2PAY_USER_ID;
    const email = process.env.B2PAY_EMAIL;
    const apiKey = process.env.B2PAY_TOKEN;

    if (!userId || !email || !apiKey) {
      throw new BadGatewayException(
        'B2Pay credentials are not configured: B2PAY_USER_ID, B2PAY_EMAIL, B2PAY_API_KEY',
      );
    }

    let tokenRes;
    try {
      tokenRes = await axios.post(
        tokenUrl,
        {
          user_id: userId,
          email,
          api_key: apiKey,
          token_expiry_hours: tokenExpiryHours,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        },
      );
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        '';

      if (String(message).toLowerCase().includes('temporarily locked')) {
        this.b2payAuthLockedUntil = now + 15 * 60 * 1000;
      }

      throw err;
    }

    const token = tokenRes.data?.token || tokenRes.data?.data?.token;
    if (!token) {
      throw new Error(
        `B2Pay token/get returned empty token: ${JSON.stringify(tokenRes.data)}`,
      );
    }

    this.b2payJwtToken = token;
    this.b2payJwtExpiresAt = now + tokenExpiryHours * 60 * 60 * 1000;
    return token;
  }

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

  async createBill({ amount, orderId }) {
    try {
      const form = new FormData();
      form.append('amount', amount);
      form.append('order_id', orderId);
      form.append('description', 'Покупка товара');
      form.append('type', 'normal');
      form.append('shop_id', process.env.PALLY_MAGAZINE_ID);
      form.append('currency_in', 'RUB');
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

  async createPaymentB2Pay(
    orderId: string,
    amount: number,
    currency: string,
    email: string,
    ip: string,
  ) {
    try {
      const token = await this.getB2PayJwtToken();
      const apiUrl = process.env.B2PAY_API_URL
      const res = await axios.post(
        apiUrl,
        {
          customer_id: email,
          amount: Number(amount.toFixed(2)),
          currency,
          description: `Payment for order #${orderId}`,
          metadata: {
            tracking_id: orderId,
            customer_email: email,
            customer_ip: ip,
            return_url: `${process.env.FRONT_URL}/preview/${orderId}`,
            notification_url: `${process.env.BACKEND_URL}/checkout/b2pay/callback`,
            test_mode: process.env.NODE_ENV !== 'production',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        },
      );

      const redirectUrl =
        res.data?.metadata?.auth_url ||
        res.data?.auth_url ||
        res.data?.payment_url ||
        res.data?.link;

      if (!redirectUrl) {
        throw new Error('B2Pay invalid response: redirect url is missing');
      }

      return redirectUrl;
    } catch (err) {
      const upstreamError = err?.response?.data;
      const upstreamStatus = err?.response?.status;
      console.error('B2Pay error:', {
        status: upstreamStatus,
        data: upstreamError || err,
      });

      throw new BadGatewayException(
        upstreamError?.error ||
        upstreamError?.message ||
        upstreamError?.details ||
        'B2Pay payment failed',
      );
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
            amount: Math.round(price * data.count),
            orderId,
          });
          break;
        case 'b2pay':
          payUrl = await this.createPaymentB2Pay(
            orderId,
            finalPrice,
            data.currency,
            transaction.email,
            ip
          );
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
          data: { status: 'error', jsonPayload: JSON.stringify(data) },
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
          jsonPayload: JSON.stringify(data)
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
      console.log(error)
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
    return transaction;
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
        cheat: {
          include: {
            catalog: {
              select: {
                link: true,
                title: true,
              },
            },
          },
        },
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
