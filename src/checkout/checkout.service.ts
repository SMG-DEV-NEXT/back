import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CheckoutDto } from './dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, Transaction, User } from '@prisma/client';
import {
  generateCheckoutAutoRegisterMail,
  generatorAfterCheckoutMail,
} from 'src/mail/generator';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { MailService } from 'src/mail/mail.service';
import * as crypto from 'crypto';
import axios from 'axios';
import * as FormData from 'form-data';
import * as bcrypt from 'bcryptjs';
import { AuditService } from 'src/audit/audit.service';
import { AuditAction } from 'constants/audit-actions';

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);
  private readonly allowedPaymentMethods = new Set(['fk', 'pally', 'b2pay']);
  private readonly allowedCurrencies = new Set(['RUB', 'USD']);
  private readonly maxCheckoutPriceRub = Number(
    process.env.MAX_CHECKOUT_PRICE_RUB || 1_000_000,
  );
  private b2payJwtToken: string | null = null;
  private b2payJwtExpiresAt = 0;
  private b2payAuthLockedUntil = 0;

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private readonly httpService: HttpService,
    private readonly audit: AuditService,
  ) { }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private securityLog(event: string, details: Record<string, any> = {}) {
    this.logger.warn({ event, ...details });
    void this.audit.logSecurity(
      AuditAction.SUSPICIOUS_ACTIVITY,
      {
        ip: details.ip || null,
        method: details.method || null,
        endpoint: details.path || null,
      },
      {
        userId: details.authUserId || details.userId || null,
        metadata: { event, ...details },
      },
    );
  }

  private roundMoney(value: number): number {
    return Number(value.toFixed(2));
  }

  private assertFiniteMoney(value: number, label: string) {
    if (!Number.isFinite(value) || Number.isNaN(value)) {
      this.securityLog('invalid_price', { label, value });
      throw new BadRequestException('Invalid checkout amount');
    }
    if (value < 0) {
      this.securityLog('negative_price_attempt', { label, value });
      throw new BadRequestException('Invalid checkout amount');
    }
  }

  validateCount(count: number) {
    // Prevents negative quantity and inventory exhaustion attacks from crafted Postman payloads.
    if (!Number.isInteger(count) || count <= 0 || count > 10) {
      this.securityLog('invalid_count', { count });
      throw new BadRequestException('Invalid count');
    }
  }

  validateCurrency(currency: string) {
    // Only known currencies are accepted so attackers cannot force unsupported conversion branches.
    if (!this.allowedCurrencies.has(currency)) {
      this.securityLog('invalid_currency', { currency });
      throw new BadRequestException('Invalid currency');
    }
  }

  validatePaymentMethod(methodPay: string) {
    // Payment provider is selected server-side from a whitelist to avoid fake/unimplemented methods.
    if (!this.allowedPaymentMethods.has(methodPay)) {
      this.securityLog('invalid_methodPay', { methodPay });
      throw new BadRequestException('Invalid payment method');
    }
  }

  validateDiscount(percent: number, source: string) {
    // Percent limits block negative-price and free-checkout abuse via invalid promo/referral/reseller data.
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      this.securityLog(`invalid_${source}`, { percent });
      throw new BadRequestException('Invalid discount');
    }
  }

  validateFinalPrice(args: {
    basePriceRub: number;
    finalPriceRub: number;
    discountPercent: number;
    balanceDiscountRub?: number;
  }) {
    this.assertFiniteMoney(args.basePriceRub, 'basePriceRub');
    this.assertFiniteMoney(args.finalPriceRub, 'finalPriceRub');

    if (args.basePriceRub > this.maxCheckoutPriceRub) {
      this.securityLog('max_price_limit_exceeded', {
        basePriceRub: args.basePriceRub,
      });
      throw new BadRequestException('Invalid checkout amount');
    }

    if (args.discountPercent > 100) {
      this.securityLog('invalid_discount', {
        discountPercent: args.discountPercent,
      });
      throw new BadRequestException('Invalid discount');
    }

    const legitimateFreeCheckout =
      args.discountPercent === 100 ||
      Number(args.balanceDiscountRub || 0) >= args.basePriceRub;

    // Zero totals are allowed only when server-validated discounts or balance really cover the order.
    if (args.finalPriceRub === 0 && !legitimateFreeCheckout) {
      this.securityLog('free_checkout_abuse', args);
      throw new BadRequestException('Invalid checkout amount');
    }
  }

  private verifyFkCallbackSignature(data: any): boolean {
    const secret2 = process.env.FK_SECRET_2 || process.env.FK_SECOND_SECRET;
    const merchantId = String(data?.MERCHANT_ID || process.env.FK_SHOP_ID || '');
    const amount = data?.AMOUNT;
    const orderId = data?.MERCHANT_ORDER_ID;
    const sign = String(data?.SIGN || data?.sign || '');

    if (!secret2 || !merchantId || amount === undefined || !orderId || !sign) {
      return false;
    }

    // FreeKassa callback signature: md5(MERCHANT_ID:AMOUNT:secret2:MERCHANT_ORDER_ID).
    const expected = crypto
      .createHash('md5')
      .update(`${merchantId}:${amount}:${secret2}:${orderId}`)
      .digest('hex');

    return expected.toLowerCase() === sign.toLowerCase();
  }

  private getCallbackAmount(data: any): number | null {
    const rawAmount =
      data?.AMOUNT ??
      data?.amount ??
      data?.OutSum ??
      data?.providerPayload?.amount ??
      data?.providerPayload?.data?.amount;

    if (rawAmount === undefined || rawAmount === null || rawAmount === '') {
      return null;
    }

    const amount = Number(String(rawAmount).replace(',', '.'));
    return Number.isFinite(amount) ? this.roundMoney(amount) : null;
  }

  private validateCallbackAmount(transaction: Transaction, data: any): boolean {
    const callbackAmount = this.getCallbackAmount(data);
    if (callbackAmount === null) {
      this.securityLog('invalid_callback', {
        orderId: transaction.orderId,
        reason: 'missing_callback_amount_legacy_accepted',
        methodPay: transaction.methodPay,
      });
      return false;
    }

    const expectedAmount =
      transaction.methodPay === 'pally'
        ? this.roundMoney(
          Math.max(
            Number(transaction.realPrice || 0) -
            Number((transaction as any).balanceDiscount || 0),
            0,
          ),
        )
        : this.roundMoney(Number(transaction.checkoutedPrice || 0));

    if (Math.abs(callbackAmount - expectedAmount) > 0.01) {
      this.securityLog('invalid_callback', {
        orderId: transaction.orderId,
        reason: 'amount_mismatch',
        callbackAmount,
        expectedAmount,
        methodPay: transaction.methodPay,
      });
      throw new UnauthorizedException('Invalid callback');
    }

    return true;
  }

  validateCallback(
    data: any,
    context: {
      provider?: 'fk' | 'pally' | 'b2pay' | 'internal';
      ip?: string;
    } = {},
  ): { orderId: string; verified: boolean } {
    const provider = context.provider || 'unknown';
    const rawOrderId = data?.MERCHANT_ORDER_ID || data?.InvId || data?.order_id;
    const orderId = typeof rawOrderId === 'string' ? rawOrderId.trim() : rawOrderId;

    if (!orderId || typeof orderId !== 'string' || orderId.length > 80) {
      this.securityLog('invalid_callback', { provider, reason: 'missing_order_id' });
      throw new BadRequestException('Invalid callback');
    }

    if (provider === 'internal') {
      if (!data?.__internalCheckout && process.env.NODE_ENV !== 'development') {
        this.securityLog('invalid_callback', { provider, reason: 'internal_not_dev' });
        throw new ForbiddenException('Invalid callback');
      }
      return { orderId, verified: true };
    }

    const raw = process.env.CHECKOUT_CALLBACK_IP_WHITELIST;
    let ipWhitelist: string[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        ipWhitelist = Array.isArray(parsed) ? parsed.map(String) : [];
      } catch {
        ipWhitelist = raw.split(',').map((ip) => ip.trim()).filter(Boolean);
      }
    }

    const ipVerified = !!(ipWhitelist.length && context.ip && ipWhitelist.includes(context.ip));
    if (ipWhitelist.length && !ipVerified) {
      this.securityLog('invalid_callback', {
        provider,
        reason: 'ip_not_whitelisted',
        ip: context.ip,
      });
      throw new ForbiddenException('Invalid callback');
    }

    return { orderId, verified: ipVerified };
  }

  private validateBalanceOwner(authUser: User | null | undefined, checkoutUser: User) {
    // Balance is account-owned money. Matching by typed email is not authentication.
    if (
      !authUser ||
      authUser.id !== checkoutUser.id ||
      authUser.email.toLowerCase() !== checkoutUser.email.toLowerCase()
    ) {
      this.securityLog('balance_owner_mismatch', {
        authUserId: authUser?.id || null,
        authUserEmail: authUser?.email || null,
        checkoutUserId: checkoutUser.id,
        checkoutEmail: checkoutUser.email,
      });
      throw new UnauthorizedException('Login is required to use balance');
    }
  }

  private generateTemporaryPassword(length = 12): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i += 1) {
      const idx = Math.floor(Math.random() * chars.length);
      password += chars[idx];
    }
    return password;
  }

  private generateReferralCode(length = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const bytes = crypto.randomBytes(length);
    let code = '';
    for (let i = 0; i < length; i += 1) {
      code += chars[bytes[i] % chars.length];
    }
    return code;
  }

  private async generateUniqueReferralCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = this.generateReferralCode();
      const existing = await (this.prisma as any).user.findFirst({
        where: { referralCode: code } as any,
        select: { id: true },
      });
      if (!existing) return code;
    }
    return this.generateReferralCode(12);
  }

  private async autoRegisterCheckoutUser(email: string, locale: string, referredByCode?: string | null, ip?: string | null) {
    const temporaryPassword = this.generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
    const normalizedEmail = this.normalizeEmail(email);
    const referralCode = await this.generateUniqueReferralCode();

    const createdUser = await this.prisma.user.create({
      data: {
        name: normalizedEmail.split('@')[0] || 'User',
        email: normalizedEmail,
        password: hashedPassword,
        role: 'user',
        raiting: '0',
        isTwoFactorEnabled: false,
        resetCode: '',
        accept: true,
        ...(referralCode ? { referralCode } as any : {}),
        ...(referredByCode ? { referredByCode } as any : {}),
        ...(ip ? { registrationIp: ip } as any : {}),
      },
    });

    await (this.prisma as any).userLog.create({
      data: { userId: createdUser.id, email: normalizedEmail, action: 'checkout_register', ip: ip || null },
    });

    const lang = locale === 'en' ? 'en' : 'ru';
    await this.mail.sendFromNoreply(
      createdUser.email,
      lang === 'en' ? 'Your SMG account has been created' : 'Ваш аккаунт SMG создан',
      null,
      generateCheckoutAutoRegisterMail(temporaryPassword, lang),
    );

    return createdUser;
  }

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
          proxy: false
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
    ip?: string,
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

    const signature = crypto
      .createHmac('sha256', process.env.FK_API_KEY)
      .update(signString)
      .digest('hex');

    try {
      const response = await axios.post('https://api.fk.life/v1/orders/create', {
        ...data,
        signature,
      }, {
        proxy: false
      });
      return response.data?.location;
    } catch (err) {
      void this.audit.logPaymentProviderError('fk', { ip, method: 'POST', endpoint: '/checkout' }, {
        orderId,
        amount,
        currency,
        error: err?.response?.data?.message || err?.message,
        metadata: { status: err?.response?.status, data: err?.response?.data },
      });
      throw err;
    }
  }

  async createBill({ amount, orderId, ip }: { amount: number; orderId: string; ip?: string }) {
    const form = new FormData();
    form.append('amount', amount);
    form.append('order_id', orderId);
    form.append('description', 'Покупка товара');
    form.append('type', 'normal');
    form.append('shop_id', process.env.PALLY_MAGAZINE_ID);
    form.append('currency_in', 'RUB');
    form.append('custom', '');
    form.append('payer_pays_commission', '0');
    form.append('name', 'Платёж');

    try {
      const response = await axios.post('https://pal24.pro/api/v1/bill/create', form, {
        headers: {
          Authorization: `Bearer ${process.env.PALLY_TOKEN}`,
          ...form.getHeaders(),
        },
        proxy: false
      });
      return response.data.link_page_url;
    } catch (err) {
      console.log(err)
      void this.audit.logPaymentProviderError('pally', { ip, method: 'POST', endpoint: '/checkout' }, {
        orderId,
        amount,
        currency: 'RUB',
        error: err?.response?.data?.errors
          ? JSON.stringify(err.response.data.errors)
          : err?.message,
        metadata: { status: err?.response?.status, data: err?.response?.data },
      });
      throw err;
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
          proxy: false
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
      void this.audit.logPaymentProviderError('b2pay', { ip, method: 'POST', endpoint: '/checkout' }, {
        orderId,
        amount,
        currency,
        error: upstreamError?.error || upstreamError?.message || err?.message,
        metadata: { status: upstreamStatus, data: upstreamError },
      });
      throw new BadGatewayException(
        upstreamError?.error ||
        upstreamError?.message ||
        upstreamError?.details ||
        'B2Pay payment failed',
      );
    }
  }

  private async createBalanceHistory(
    userId: string,
    type: string,
    information: Record<string, any>,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return (client as any).balanceHistory.create({
      data: {
        userId,
        type,
        information: JSON.stringify(information),
      },
    });
  }

  async useFromBalance(
    userId: string,
    transactionPriceRub: number,
    options: {
      isUsd?: boolean;
      usdRate?: number;
      payload?: Record<string, any>;
    } = {},
  ) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');

      const payload = options.payload || {};
      const isUsd = !!options.isUsd;
      const usdRate = Number(options.usdRate) > 0 ? Number(options.usdRate) : 1;

      const balanceBefore = (user as any).balance || 0;
      const balanceDiscountRub = this.roundMoney(
        Math.min(balanceBefore, transactionPriceRub),
      );
      const finalPriceRub = this.roundMoney(
        Math.max(transactionPriceRub - balanceDiscountRub, 0),
      );
      const finalPrice = isUsd
        ? this.roundMoney(finalPriceRub / usdRate)
        : finalPriceRub;
      const balanceAfter = this.roundMoney(
        Math.max(balanceBefore - balanceDiscountRub, 0),
      );

      if (balanceDiscountRub > 0) {
        const updated = await tx.user.updateMany({
          where: { id: userId, balance: { gte: balanceDiscountRub } },
          data: { balance: { decrement: balanceDiscountRub } } as any,
        });
        if (updated.count !== 1) {
          this.securityLog('double_spend_blocked', { userId, payload });
          throw new BadRequestException('Invalid balance state');
        }
      }

      return {
        finalPrice,
        balanceDiscount: balanceDiscountRub,
        balanceDiscountRub,
        finalPriceRub,
        balanceBefore,
        balanceAfter,
        isUsedBalance: balanceDiscountRub > 0,
      };
    });
  }

  private async getUserSuccessfulSpent(userId: string): Promise<number> {
    const aggregate = await this.prisma.transaction.aggregate({
      where: {
        userId,
        status: 'success',
      },
      _sum: {
        realPrice: true,
      },
    });

    return Number(aggregate._sum.realPrice || 0);
  }

  private async getLoyaltyDiscount(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return 0;

    const setting = await this.prisma.setting.findUnique({
      where: { title: 'loyalty_tiers' },
    });
    if (!setting) return 0;

    const { tiers } = setting.settings as any;
    if (!Array.isArray(tiers) || tiers.length === 0) return 0;

    const totalSpent = await this.getUserSuccessfulSpent(userId);

    // find the highest tier the user qualifies for
    const tier = [...tiers]
      .sort((a, b) => b.minSpent - a.minSpent)
      .find((t) => totalSpent >= t.minSpent);

    return tier?.percent || 0;
  }

  private async getServerUsdRate(): Promise<number> {
    const setting = await this.prisma.setting.findUnique({
      where: { title: 'usd' },
    });
    const rawValue = setting?.settings;
    const usdRate = Number(`${rawValue ?? 0.012}`.replace(',', '.'));

    if (!Number.isFinite(usdRate) || usdRate <= 0) {
      this.securityLog('invalid_usd', { usdRate, rawValue });
      throw new BadRequestException('Invalid currency rate');
    }

    return usdRate;
  }


  async initiatePayment(
    data: CheckoutDto,
    ip: string,
    authUser: User,
    clientInfo: Record<string, any> = {},
  ): Promise<any> {
    try {
      const normalizedEmail = this.normalizeEmail(data.email);
      data.email = normalizedEmail;
      this.validateCount(Number(data.count));
      this.validateCurrency(data.currency);
      this.validatePaymentMethod(data.methodPay);
      const serverUsdRate = await this.getServerUsdRate();
      const ref = data.ref;
      let refOwner = null;

      // Pre-validate ref to determine referredByCode before user creation/lookup
      let validatedReferredByCode: string | null = null;
      if (ref) {
        const adminRefExists = await this.prisma.referral.findFirst({
          where: { code: ref },
          select: { id: true },
        });
        if (adminRefExists) {
          validatedReferredByCode = ref;
        } else {
          const userRefExists = await (this.prisma as any).user.findFirst({
            where: { referralCode: ref } as any,
            select: { id: true },
          });
          if (userRefExists) {
            validatedReferredByCode = ref;
          }
        }
      }

      let user = await this.prisma.user.findFirst({
        where: {
          email: {
            equals: normalizedEmail,
            mode: 'insensitive',
          },
        },
      });

      if (!user) {
        // IP fraud check: if another account from this IP already used this referral code, drop the referral silently
        let safeReferredByCode = validatedReferredByCode;
        if (safeReferredByCode && ip && process.env.NODE_ENV !== 'development') {
          const ipDuplicate = await (this.prisma as any).user.findFirst({
            where: { registrationIp: ip, referredByCode: safeReferredByCode } as any,
          });
          if (ipDuplicate) {
            safeReferredByCode = null;
          }
        }
        user = await this.autoRegisterCheckoutUser(normalizedEmail, data.locale, safeReferredByCode, ip);
      }

      if ((user as any).isDeactivated) {
        throw new ForbiddenException('account_deactivated');
      }

      let isReseller = await this.prisma.reseller.findFirst({
        where: {
          email: {
            equals: normalizedEmail,
            mode: 'insensitive',
          },
        },
      });

      const planType = data.type as 'day' | 'week' | 'month';

      const cheat = await this.prisma.cheat.findFirst({
        where: { id: data.itemId, isDeleted: false },
        include: { plan: { include: { day: true, month: true, week: true } } },
      });
      const promoCode = data.promo
        ? await this.prisma.promocode.findFirst({
          where: {
            code: data.promo,
            status: 'active',
            OR: [{ cheatIds: { isEmpty: true } }, { cheatIds: { has: data.itemId } }],
          } as any,
        })
        : null;
      if (!cheat || !cheat.plan[data.type])
        throw new NotFoundException('Product not found');

      const keyses = cheat.plan[planType].keys;
      if (keyses.length < data.count)
        throw new BadRequestException('Недостаточно ключей');
      let price = cheat.plan[data.type]?.price;
      const initialPrice = cheat.plan[data.type]?.price;
      this.assertFiniteMoney(Number(price), 'planPrice');
      this.assertFiniteMoney(Number(initialPrice), 'initialPrice');
      let discount = 0;
      let personalRefDiscountApplied = false;
      if (ref) {
        const foundReferral = await this.prisma.referral.findFirst({
          where: {
            code: ref,
          },
        });

        if (foundReferral) {
          const isOwnReferral =
            !!foundReferral.userAccountEmail &&
            foundReferral.userAccountEmail.toLowerCase() === user.email.toLowerCase();

          const alreadyUsedReferral = await this.prisma.transaction.findFirst({
            where: {
              userId: user.id,
              referralId: foundReferral.id,
              status: 'success',
            },
            select: { id: true },
          });

          if (!isOwnReferral && !alreadyUsedReferral) {
            refOwner = foundReferral;
          }
        }

        if (refOwner) {
          this.validateDiscount(Number(refOwner.prcentToPrice || 0), 'referral');
          this.validateDiscount(Number(refOwner.prcentToBalance || 0), 'referral');
        }

        if (refOwner && refOwner.prcentToPrice > 0) {
          price -= (initialPrice / 100) * refOwner.prcentToPrice;
          discount += refOwner.prcentToPrice;
        }

        // User personal referral code: 5% price discount on first purchase (only from stored code set at registration)
        if (!refOwner && (user as any).referredByCode && !(user as any).referralBonusPaid) {
          const codeOwner = await (this.prisma as any).user.findFirst({
            where: { referralCode: (user as any).referredByCode } as any,
            select: { id: true },
          });
          if (codeOwner && codeOwner.id !== user.id) {
            this.validateDiscount(5, 'referral');
            price -= (initialPrice / 100) * 5;
            discount += 5;
            personalRefDiscountApplied = true;
          }
        }
      }

      // Logged-in user with saved referredByCode and no purchase yet → auto-apply 5% discount
      // Skip if already applied above via the ref URL param (prevents double discount)
      if (!personalRefDiscountApplied && !refOwner && !(user as any).referralBonusPaid && (user as any).referredByCode) {
        const personalRefCode = (user as any).referredByCode as string;
        const codeOwner = await (this.prisma as any).user.findFirst({
          where: { referralCode: personalRefCode } as any,
          select: { id: true },
        });
        if (codeOwner && codeOwner.id !== user.id) {
          this.validateDiscount(5, 'referral');
          price -= (initialPrice / 100) * 5;
          discount += 5;
        }
      }

      // Loyalty discount — based on user's total spend history
      let loyaltyPercent = 0;
      if (user?.id && authUser) {
        loyaltyPercent = await this.getLoyaltyDiscount(user.id);
      }

      // Promo OR loyalty — whichever is higher wins; they cannot stack
      const promoIsValid = !!(
        promoCode &&
        promoCode.status === 'active' &&
        promoCode.count < promoCode.maxActivate
      );
      if (promoCode) {
        this.validateDiscount(Number(promoCode.percent || 0), 'promo');
      }
      const promoPercent = promoIsValid ? promoCode.percent : 0;
      this.validateDiscount(Number(loyaltyPercent || 0), 'loyalty');

      let activePromoCode: typeof promoCode | null = null;
      let activeLoyaltyPercent = 0;
      if (promoPercent >= loyaltyPercent && promoPercent > 0) {
        // Promo code wins
        activePromoCode = promoCode;
        price -= (initialPrice / 100) * promoPercent;
        discount += promoPercent;
      } else if (loyaltyPercent > promoPercent && loyaltyPercent > 0) {
        // Loyalty discount wins
        activeLoyaltyPercent = loyaltyPercent;
        price -= (initialPrice / 100) * loyaltyPercent;
        discount += loyaltyPercent;
      }

      if (isReseller && user && isReseller.email === user.email) {
        this.validateDiscount(Number(isReseller.prcent || 0), 'reseller');
        price -= (initialPrice / 100) * isReseller.prcent;
        discount += isReseller.prcent;
      } else {
        isReseller = null;
      }
      if (cheat.plan[data.type].prcent > 0) {
        this.validateDiscount(Number(cheat.plan[data.type].prcent || 0), 'plan');
        price -= (initialPrice / 100) * cheat.plan[data.type].prcent;
        discount += cheat.plan[data.type].prcent;
      }
      this.validateDiscount(discount, 'discount');
      const totalPriceRub = this.roundMoney(price * data.count);
      this.assertFiniteMoney(totalPriceRub, 'totalPriceRub');
      const baseFinalPrice =
        data.currency === 'USD'
          ? this.roundMoney(totalPriceRub / serverUsdRate)
          : totalPriceRub; // рубли * кол-во

      let finalPrice = baseFinalPrice;
      let balanceDiscount = 0;
      let isUsedBalance = false;

      if (data.isUsedBalance && user?.id) {
        this.validateBalanceOwner(authUser, user);
        const balanceUsage = await this.useFromBalance(user.id, totalPriceRub, {
          isUsd: data.currency === 'USD',
          usdRate: serverUsdRate,
          payload: {
            source: 'checkout',
            email: data.email,
            itemId: data.itemId,
            type: data.type,
            count: data.count,
            currency: data.currency,
            ip,
            authUserId: authUser?.id || null,
            clientInfo,
          },
        });
        finalPrice = balanceUsage.finalPrice;
        balanceDiscount = balanceUsage.balanceDiscount;
        isUsedBalance = balanceUsage.isUsedBalance;
      }

      this.validateFinalPrice({
        basePriceRub: totalPriceRub,
        finalPriceRub: this.roundMoney(totalPriceRub - balanceDiscount),
        discountPercent: discount,
        balanceDiscountRub: balanceDiscount,
      });

      // 1. Создаём транзакцию с пометкой "pending"
      // Unpredictable order ids make blind Postman callback guessing materially harder.
      const orderId = `ORD-${Date.now()}-${crypto.randomBytes(12).toString('hex')}`;
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
              ? this.roundMoney((cheat.plan[data.type].price * data.count) / serverUsdRate)
              : cheat.plan[data.type].price * data.count,
          checkoutedPrice: finalPrice,
          discount,
          promoCode: activePromoCode?.code,
          loyaltyDiscount: activeLoyaltyPercent,
          count: data.count,
          ip,
          // @ts-ignore
          status: 'pending',
          userLanguage: data.locale,
          orderId,
          currency: data.currency,
          realPrice: Math.round(price * data.count),
          methodPay: data.methodPay,
          balanceDiscount,
          isUsedBalance,
        } as any,
      });

      if (finalPrice <= 0) {
        await this.handleCallback(
          {
            MERCHANT_ORDER_ID: orderId,
            __internalCheckout: true,
            reason: 'VALID_FREE_CHECKOUT',
          },
          { provider: 'internal' },
        );
        return `${process.env.FRONT_URL}/${data.locale}/preview/${orderId}`;
      }
      console.log(finalPrice, data.methodPay)

      // const amountStr = Number(finalPrice).toFixed(2); // "2000.00"
      if (process.env.NODE_ENV === 'development' && process.env.CHECKOUT_AUTO_SUCCESS === 'true') {
        await this.handleCallback(
          {
            MERCHANT_ORDER_ID: orderId,
            __internalCheckout: true,
            reason: 'DEVELOPMENT_AUTO_SUCCESS',
          },
          { provider: 'internal' },
        );
        return `${process.env.FRONT_URL}/${data.locale}/preview/${orderId}`;
      }
      let payUrl = '';
      switch (data.methodPay) {
        case 'fk':
          payUrl = await this.createPaymentFk(
            orderId,
            finalPrice,
            data.currency,
            transaction.email,
            data.variantPay,
            ip,
          );
          break;
        case 'pally':
          payUrl = await this.createBill({
            amount:
              data.currency === 'USD'
                ? Math.round(finalPrice * serverUsdRate)
                : Math.round(finalPrice),
            orderId,
            ip,
          });
          break;
        case 'b2pay':
          payUrl = await this.createPaymentB2Pay(
            orderId,
            finalPrice,
            data.currency,
            transaction.email,
            ip,
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
      console.log(error)
      this.logger.error(error?.message || error);

      // Pass through client errors as-is (validation, not found, etc.)
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof UnprocessableEntityException
      ) {
        throw error;
      }

      // Payment provider returned an HTTP error — map to user-friendly bilingual message
      const upstreamMsg: string = (
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        ''
      ).toLowerCase();

      if (upstreamMsg.includes('ip') || upstreamMsg.includes('access_denied') || upstreamMsg.includes('ip_access')) {
        return {
          error: {
            ru: 'Платёжный сервис временно недоступен. Попробуйте другой способ оплаты или обратитесь в поддержку.',
            en: 'Payment service is temporarily unavailable. Please try another payment method or contact support.',
          },
        };
      }

      if (upstreamMsg.includes('locked') || upstreamMsg.includes('temporarily')) {
        return {
          error: {
            ru: 'Платёжный сервис временно заблокирован. Пожалуйста, подождите несколько минут и попробуйте снова.',
            en: 'Payment service is temporarily locked. Please wait a few minutes and try again.',
          },
        };
      }

      if (upstreamMsg.includes('amount') || upstreamMsg.includes('сумм')) {
        return {
          error: {
            ru: 'Ошибка суммы платежа. Проверьте данные и попробуйте снова.',
            en: 'Payment amount error. Please check the details and try again.',
          },
        };
      }

      // Generic provider failure
      return {
        error: {
          ru: 'Ошибка при создании платежа. Попробуйте другой способ оплаты или повторите попытку позже.',
          en: 'Payment creation failed. Please try another payment method or try again later.',
        },
      };
    }
  }


  async handleCallback(
    data: any,
    context: {
      provider?: 'fk' | 'pally' | 'b2pay' | 'internal';
      ip?: string;
    } = {},
  ) {
    try {
      if (!context.provider) {
        const rawOrderId = data?.MERCHANT_ORDER_ID || data?.InvId || data?.order_id;
        const preflightOrderId = typeof rawOrderId === 'string' ? rawOrderId.trim() : null;

        if (!preflightOrderId || preflightOrderId.length > 80) {
          this.securityLog('invalid_callback', { reason: 'missing_order_id' });
          throw new BadRequestException('Invalid callback');
        }

        const preflight = await this.prisma.transaction.findFirst({
          where: { orderId: preflightOrderId },
          select: { methodPay: true },
        });

        if (!preflight) {
          this.securityLog('invalid_callback', { orderId: preflightOrderId, reason: 'not_found' });
          throw new NotFoundException('Transaction not found');
        }

        context = { ...context, provider: preflight.methodPay as 'fk' | 'pally' | 'b2pay' };
      }

      const { orderId, verified } = this.validateCallback(data, context);

      const processedTransaction = await this.prisma.$transaction(async (tx) => {
        const lock = await tx.transaction.updateMany({
          where: { orderId, status: 'pending' },
          data: {
            // The pending -> processing transition is the idempotency lock against double callbacks.
            status: 'processing',
            jsonPayload: data,
          } as any,
        });

        if (lock.count !== 1) {
          const existing = await tx.transaction.findFirst({ where: { orderId } });
          if (!existing) {
            this.securityLog('invalid_callback', { orderId, reason: 'not_found' });
            throw new NotFoundException('Transaction not found');
          }

          this.securityLog('duplicate_callback', {
            orderId,
            status: existing.status,
          });
          return "YES";
        }

        const transaction = await tx.transaction.findFirst({
          where: { orderId },
        });
        if (!transaction || transaction.status !== 'processing') {
          this.securityLog('invalid_callback', {
            orderId,
            reason: 'not_processing_after_lock',
          });
          throw new BadRequestException('Invalid transaction state');
        }

        this.validatePaymentMethod((transaction as any).methodPay);
        if (
          context.provider &&
          context.provider !== 'internal' &&
          transaction.methodPay !== context.provider
        ) {
          this.securityLog('invalid_callback', {
            orderId,
            reason: 'provider_mismatch',
            expected: transaction.methodPay,
            got: context.provider,
          });
          throw new UnauthorizedException('Invalid callback');
        }
        const providerVerified =
          verified ||
          (transaction.methodPay === 'fk' && this.verifyFkCallbackSignature(data));

        if (context.provider !== 'internal' && !providerVerified) {
          const amountVerified = this.validateCallbackAmount(
            transaction as Transaction,
            data,
          );
          if (!amountVerified) {
            // Legacy compatibility with the old callback flow: some providers only post order id/status.
            // This is still guarded by pending-only processing, provider matching when known,
            // server-side price validation, and duplicate callback locking.
            this.securityLog('legacy_callback_without_amount', {
              orderId,
              methodPay: transaction.methodPay,
              ip: context.ip,
            });
          }
        }
        this.validateCount(Number(transaction.count));
        this.validateCurrency(String(transaction.currency));
        this.validateFinalPrice({
          basePriceRub: Number(transaction.realPrice || 0),
          finalPriceRub: Math.max(
            Number(transaction.realPrice || 0) -
            Number((transaction as any).balanceDiscount || 0),
            0,
          ),
          discountPercent: Number(transaction.discount || 0),
          balanceDiscountRub: Number((transaction as any).balanceDiscount || 0),
        });

        if (transaction.promoCode) {
          await tx.promocode.update({
            where: { code: transaction.promoCode },
            data: { count: { increment: 1 } },
          });
        }

        let referral = null;
        if (transaction.referralId) {
          referral = await tx.referral.findUnique({
            where: { id: transaction.referralId },
          });

          if (referral) {
            this.validateDiscount(Number(referral.prcentToBalance || 0), 'referral');
            this.validateDiscount(Number(referral.prcentToPrice || 0), 'referral');
            await tx.referral.update({
              where: { id: transaction.referralId },
              data: { transactions: { connect: { id: transaction.id } } },
            });
          } else {
            this.securityLog('invalid_referral', {
              transactionId: transaction.id,
              referralId: transaction.referralId,
            });
          }
        }

        const cheat = await tx.cheat.findFirst({
          where: { id: transaction.cheatId, isDeleted: false },
          include: { plan: { include: { day: true, month: true, week: true } } },
        });

        if (!cheat?.plan?.[transaction.type]) {
          this.securityLog('invalid_callback', {
            orderId,
            reason: 'missing_plan',
          });
          throw new BadRequestException('Invalid transaction');
        }

        const plan = cheat.plan[transaction.type];
        const keyses = [...(plan.keys || [])];
        const count = Number(transaction.count);

        if (keyses.length < count) {
          await tx.transaction.update({
            where: { id: transaction.id },
            data: { status: 'error', jsonPayload: data } as any,
          });
          return null;
        }

        const checkoutKeyses = keyses.slice(0, count);
        const remainingKeys = keyses.slice(count);

        await tx.period.update({
          where: { id: plan.id },
          data: { keys: remainingKeys },
        });

        const updatedTransaction = await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'success',
            codes: checkoutKeyses,
            jsonPayload: data,
          } as any,
        });

        if (referral?.userAccountEmail) {
          const referralUser = await tx.user.findFirst({
            where: {
              email: {
                equals: referral.userAccountEmail,
                mode: 'insensitive',
              },
            },
          });

          if (referralUser && referralUser.id !== transaction.userId) {
            const referralBonusPercent = Number(referral.prcentToBalance || 0);
            if (referralBonusPercent > 0) {
              const checkoutedPriceRub = this.roundMoney(
                Math.max(
                  Number((transaction as any).realPrice || 0) -
                  Number((transaction as any).balanceDiscount || 0),
                  0,
                ),
              );
              const referralBonus = this.roundMoney(
                (checkoutedPriceRub * referralBonusPercent) / 100,
              );

              if (referralBonus > 0) {
                const balanceBefore = (referralUser as any).balance || 0;
                const balanceAfter = this.roundMoney(balanceBefore + referralBonus);

                await tx.user.update({
                  where: { id: referralUser.id },
                  data: { balance: { increment: referralBonus } } as any,
                });

                await this.createBalanceHistory(
                  referralUser.id,
                  'ADD_BALANCE',
                  {
                    action: 'REFERRAL_BONUS_CALLBACK',
                    balanceBefore,
                    balanceAfter,
                    bonusPercent: referralBonusPercent,
                    bonusAmount: referralBonus,
                    bonusBaseRub: checkoutedPriceRub,
                    referralId: referral.id,
                    referralCode: referral.code,
                    referralOwner: referral.owner,
                    referralUserEmail: referral.userAccountEmail,
                    buyerEmail: transaction.email,
                    buyerUserId: transaction.userId || null,
                    transactionId: transaction.id,
                    orderId: transaction.orderId,
                    checkoutedPrice: transaction.checkoutedPrice,
                    currency: transaction.currency,
                    callbackPayload: data,
                    createdAt: new Date().toISOString(),
                  },
                  tx,
                );
              }
            }
          }
        }
        // User personal referral: 5% one-time bonus when referred user makes first purchase
        // Admin accumulating referral: prcentToBalance on every purchase by registered users
        if (transaction.userId) {
          const buyer = await tx.user.findUnique({ where: { id: transaction.userId } });
          const referredByCode = (buyer as any)?.referredByCode as string | null;
          if (referredByCode) {
            // Atomically claim the one-time bonus slot — prevents double-payment when two
            // callbacks for the same buyer's separate transactions run concurrently.
            const claimed = await tx.user.updateMany({
              where: { id: buyer.id, referralBonusPaid: false } as any,
              data: { referralBonusPaid: true } as any,
            });

            if (claimed.count === 1) {
              const referrerUser = await tx.user.findFirst({
                where: { referralCode: referredByCode } as any,
              });

              if (referrerUser && referrerUser.id !== transaction.userId) {
                const bonusBase = this.roundMoney(
                  Math.max(Number(transaction.realPrice || 0) - Number((transaction as any).balanceDiscount || 0), 0),
                );
                const bonus = this.roundMoney((bonusBase * 5) / 100);

                if (bonus > 0) {
                  const referrerBalanceBefore = (referrerUser as any).balance || 0;
                  const referrerBalanceAfter = this.roundMoney(referrerBalanceBefore + bonus);
                  await tx.user.update({
                    where: { id: referrerUser.id },
                    data: { balance: { increment: bonus } } as any,
                  });
                  await this.createBalanceHistory(
                    referrerUser.id,
                    'ADD_BALANCE',
                    {
                      action: 'USER_REFERRAL_FIRST_PURCHASE_BONUS',
                      balanceBefore: referrerBalanceBefore,
                      balanceAfter: referrerBalanceAfter,
                      bonusPercent: 5,
                      bonusAmount: bonus,
                      bonusBaseRub: bonusBase,
                      referredUserEmail: buyer.email,
                      referredUserId: buyer.id,
                      transactionId: transaction.id,
                      orderId: transaction.orderId,
                      createdAt: new Date().toISOString(),
                    },
                    tx,
                  );
                }
              }
            }

            // Check if the code belongs to an admin referral with isAccumulating enabled
            const adminReferral = await tx.referral.findFirst({
              where: { code: referredByCode, isAccumulating: true } as any,
            });
            if (adminReferral && adminReferral.userAccountEmail) {
              const accumulatingOwner = await tx.user.findFirst({
                where: {
                  email: { equals: adminReferral.userAccountEmail, mode: 'insensitive' },
                },
              });
              if (accumulatingOwner && accumulatingOwner.id !== transaction.userId) {
                const bonusPercent = Number(adminReferral.prcentToBalance || 0);
                this.validateDiscount(bonusPercent, 'referral');
                if (bonusPercent > 0) {
                  const bonusBase = this.roundMoney(
                    Math.max(Number(transaction.realPrice || 0) - Number((transaction as any).balanceDiscount || 0), 0),
                  );
                  const bonus = this.roundMoney((bonusBase * bonusPercent) / 100);

                  if (bonus > 0) {
                    const balanceBefore = (accumulatingOwner as any).balance || 0;
                    const balanceAfter = this.roundMoney(balanceBefore + bonus);
                    await tx.user.update({
                      where: { id: accumulatingOwner.id },
                      data: { balance: { increment: bonus } } as any,
                    });
                    await tx.referral.update({
                      where: { id: adminReferral.id },
                      data: { transactions: { connect: { id: transaction.id } } },
                    });
                    await this.createBalanceHistory(
                      accumulatingOwner.id,
                      'ADD_BALANCE',
                      {
                        action: 'ACCUMULATING_REFERRAL_BONUS',
                        balanceBefore,
                        balanceAfter,
                        bonusPercent,
                        bonusAmount: bonus,
                        bonusBaseRub: bonusBase,
                        referralCode: adminReferral.code,
                        referralId: adminReferral.id,
                        referredUserEmail: buyer.email,
                        referredUserId: buyer.id,
                        transactionId: transaction.id,
                        orderId: transaction.orderId,
                        createdAt: new Date().toISOString(),
                      },
                      tx,
                    );
                  }
                }
              }
            }
          }
        }

        if (transaction.userId && (transaction as any).isUsedBalance) {
          const checkoutUser = await tx.user.findUnique({
            where: { id: transaction.userId },
          });

          if (checkoutUser) {
            const balanceAfter = (checkoutUser as any).balance || 0;
            const balanceDiscount = (transaction as any).balanceDiscount || 0;
            const balanceBefore = this.roundMoney(balanceAfter + balanceDiscount);

            await this.createBalanceHistory(
              transaction.userId,
              'CHECKOUT',
              {
                action: 'CHECKOUT',
                transactionId: transaction.id,
                orderId: transaction.orderId,
                email: transaction.email,
                cheatId: transaction.cheatId,
                type: transaction.type,
                count: transaction.count,
                currency: transaction.currency,
                methodPay: transaction.methodPay,
                price: transaction.price,
                checkoutedPrice: transaction.checkoutedPrice,
                realPrice: transaction.realPrice,
                codes: checkoutKeyses,
                ip: transaction.ip,
                promoCode: transaction.promoCode,
                referralId: transaction.referralId,
                reseller: transaction.reseller,
                isUsedBalance: (transaction as any).isUsedBalance || false,
                balanceDiscount,
                balanceBefore,
                balanceAfter,
                callbackPayload: data,
                createdAt: new Date().toISOString(),
              },
              tx,
            );
          }
        }

        return { ...updatedTransaction, codes: checkoutKeyses };
      });

      if (processedTransaction) {
        await this.sendMail(processedTransaction as Transaction);
      }

      return 'YES';
    } catch (error) {
      this.securityLog('invalid_callback', {
        reason: error?.message || 'callback_failed',
      });
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      throw new BadGatewayException('Payment callback failed');
    }
  }

  async manuallyCompletePendingTransaction(
    transactionId: string,
    adminUser: User,
    metadata: Record<string, any> = {},
  ) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.status === 'success') {
      return { ok: true, alreadyCompleted: true };
    }

    if (transaction.status !== 'pending') {
      this.securityLog('admin_manual_callback_rejected', {
        transactionId,
        orderId: transaction.orderId,
        status: transaction.status,
        authUserId: adminUser?.id,
        authUserEmail: adminUser?.email,
        metadata,
      });
      throw new BadRequestException('Only pending transactions can be completed');
    }

    // Admin repair path for confirmed payments whose provider callback was lost.
    // It still uses the same pending-only callback processor, so keys/bonuses cannot be issued twice.
    await this.handleCallback(
      {
        MERCHANT_ORDER_ID: transaction.orderId,
        __internalCheckout: true,
        reason: 'ADMIN_MANUAL_CALLBACK',
        adminUserId: adminUser?.id,
        adminEmail: adminUser?.email,
        metadata,
      },
      { provider: 'internal' },
    );

    this.securityLog('admin_manual_callback_completed', {
      transactionId,
      orderId: transaction.orderId,
      authUserId: adminUser?.id,
      authUserEmail: adminUser?.email,
      metadata,
    });

    return { ok: true };
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
    page?: number;
    limit?: number;
    filters?: { key: string; value: string }[];
  }) {
    const { page = 1, limit = 10, filters = [] } = params;

    const where: any = {};

    for (const { key, value } of filters) {
      switch (key) {
        case 'email':
          where.OR = [
            { email: { contains: value, mode: 'insensitive' } },
            { ip: { contains: value, mode: 'insensitive' } },
          ];
          break;
        case 'cheatId':
          where.cheatId = value
          break;
        case 'catalogId': {
          if (where.cheatId) break;
          const catalogCheats = await this.prisma.cheat.findMany({
            where: { catalogId: value },
            select: { id: true },
          });
          const ids = catalogCheats.map((c) => c.id);
          if (ids.length === 0) {
            return { data: [], total: 0, page, limit, totalPages: 0 };
          }
          where.cheatId = { in: ids };
          break;
        }
        case 'methodPay':
          where.methodPay = value;
          break;
        case 'status':
          where.status = value;
          break;
        case 'received':
          where.status = value === 'true' ? 'success' : { not: 'success' };
          break;
        case 'isUsedBalance':
          where.isUsedBalance = value === 'true';
          break;
        case 'promoCode':
          where.promoCode = value;
          break;
        case 'referralId':
          where.referralId = value;
          break;
        case 'userReferralCode': {
          const referredUsers = await (this.prisma as any).user.findMany({
            where: { referredByCode: value } as any,
            select: { id: true },
          });
          const userIds = referredUsers.map((u: any) => u.id);
          if (userIds.length === 0) {
            return { data: [], total: 0, page, limit, totalPages: 0 };
          }
          where.userId = { in: userIds };
          break;
        }
        case 'reseller':
          where.reseller = value;
          break;
        case 'userLanguage':
          where.userLanguage = value;
          break;
        case 'currency':
          where.currency = value;
          break;
        case 'orderId':
          where.orderId = { contains: value, mode: 'insensitive' };
          break;
        case 'startDate':
          where.createdAt = { ...where.createdAt, gte: new Date(value) };
          break;
        case 'endDate':
          where.createdAt = { ...where.createdAt, lte: new Date(value) };
          break;
      }
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
        referral: {
          select: { code: true },
        },
        user: {
          select: { referredByCode: true } as any,
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
