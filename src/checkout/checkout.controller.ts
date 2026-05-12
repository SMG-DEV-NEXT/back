import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CheckoutDto } from './dto';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import sendErrorNotification from 'src/utils/sendTGError';
import { generateTransaction } from 'src/utils/generateTransaction';
import { Role } from 'constants/roles';
import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { OptionalJwtAuthGuard } from 'src/utils/isOptionalAuth';
import { AuditService } from 'src/audit/audit.service';
import { AuditAction } from 'constants/audit-actions';

function getClientIp(req: Request): string {
  const ipHeader =
    (req.headers['x-real-ip'] as string) ||
    (req.headers['x-forwarded-for'] as string) ||
    req.socket.remoteAddress ||
    '';

  // Take first IP if multiple, and strip IPv6 prefix (::ffff:)
  return ipHeader
    .split(',')[0]
    .trim()
    .replace(/^::ffff:/, '');
}
@Controller('checkout')
export class CheckoutController {
  constructor(
    private readonly checkoutService: CheckoutService,
    private readonly auditService: AuditService,
  ) { }

  private getClientInfo(req: any) {
    const forwardedFor = req.headers['x-forwarded-for']?.toString();
    const ip = forwardedFor?.split(',')[0]?.trim() || req.socket?.remoteAddress;

    return {
      ip,
      userAgent: req.headers['user-agent'] || null,
      origin: req.headers.origin || null,
      referer: req.headers.referer || null,
      host: req.headers.host || null,
      language: req.headers['accept-language'] || null,
      secChUa: req.headers['sec-ch-ua'] || null,
      secChUaPlatform: req.headers['sec-ch-ua-platform'] || null,
      secChUaMobile: req.headers['sec-ch-ua-mobile'] || null,
    };
  }

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  async checkout(@Body() data: CheckoutDto, @Req() req: any) {
    const user = await req.user;
    const ip =
      req.headers['x-forwarded-for']?.toString().split(',')[0] || // If behind proxy
      req.socket.remoteAddress;
    return this.checkoutService.initiatePayment(
      data,
      ip,
      user,
      this.getClientInfo(req),
    );
  }

  @Get('/client')
  @UseGuards(AuthGuard('jwt'))
  async getTransactionsByUser(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Req() request: any,
  ) {
    try {
      const user = await request.user;
      const pageNumber = parseInt(page.toString(), 10);
      const pageSize = parseInt(limit.toString(), 10);
      return this.checkoutService.getTransactionsClient(
        user.id,
        pageNumber,
        pageSize,
        user.email,
      );
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Post('/callback')
  @HttpCode(200)
  async paymentCallback(
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const ip = getClientIp(req);
    void this.auditService.logTransaction(AuditAction.WEBHOOK_RECEIVED, {
      ip,
      method: 'POST',
      endpoint: '/checkout/callback',
      userAgent: req.headers['user-agent'],
    }, {
      metadata: {
        body: JSON.stringify(body),
        ip,
        headers: req.headers as Record<string, any>,
      },
    });
    const result = await this.checkoutService.handleCallback(body, {
      ip,
      headers: req.headers as Record<string, any>,
    });
    return res.send(result);
  }

  @Post('/b2pay/callback')
  @HttpCode(200)
  async b2payCallback(@Body() body: any, @Req() req: Request) {
    const status = (body?.status || '').toLowerCase();
    const orderId =
      body?.metadata?.tracking_id ||
      body?.tracking_id ||
      body?.orderNumber ||
      body?.order_id;

    void this.auditService.logTransaction(AuditAction.WEBHOOK_RECEIVED, {
      ip: getClientIp(req),
      method: 'POST',
      endpoint: '/checkout/b2pay/callback',
      userAgent: req.headers['user-agent'],
    }, {
      metadata: {
        MERCHANT_ORDER_ID: orderId,
        providerPayload: body,
        provider: 'b2pay',
        ip: getClientIp(req),
        headers: req.headers as Record<string, any>,
      },
    });

    if (!orderId) return { ok: false };

    if (['approved', 'success', 'succeeded', 'paid', 'completed'].includes(status)) {
      await this.checkoutService.handleCallback(
        {
          MERCHANT_ORDER_ID: orderId,
          providerPayload: body,
        },
        {
          provider: 'b2pay',
          ip: getClientIp(req),
          headers: req.headers as Record<string, any>,
        },
      );
    }

    return { ok: true };
  }

  @Get('document')
  @UseGuards(AuthGuard('jwt'))
  async downloadDocument(
    @Res() res: Response,
    @Req() req: any,
    @Query('id') id: string,
    @Query('locale') locale: string,
  ) {
    const path = req.url; // e.g., "/ru/catalog/abc123"
    // Get your data from DB
    const user = await req.user;
    const transaction: any = await this.checkoutService.downloadDocument(id);

    if (!transaction) {
      return res.status(404).send('Transaction not found');
    }
    if (transaction.email !== user.email) {
      return null;
    }
    const instructions =
      locale === 'ru'
        ? transaction.cheat.instructionRu || 'Инструкции недоступны.'
        : transaction.cheat.instructionEn || 'Instructions are not available.';
    const codesFormatted = transaction.codes
      .map((code, i) => `${i + 1}. ${code}`)
      .join('\n');

    const dateStr = new Date(transaction.createdAt).toLocaleString(
      locale === 'ru' ? 'ru-RU' : 'en-US',
    );

    // Format data into text
    const fileContent = generateTransaction(
      transaction,
      locale,
      dateStr,
      codesFormatted,
      instructions,
    );
    const filename = `transaction-${transaction.id}.txt`;

    res.set({
      'Content-Type': 'text/plain',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    res.send(fileContent);
  }

  @Post('admin/:id/manual-callback')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async manuallyCompletePendingTransaction(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { reason?: string } = {},
  ) {
    const user = await req.user;
    return this.checkoutService.manuallyCompletePendingTransaction(id, user, {
      reason: body?.reason || 'admin_table_button',
    });
  }

  @Get('/:id')
  async getTransactionPreview(@Param() param) {
    try {
      return this.checkoutService.getTransactionPreview(param.id);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get()
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async getFilteredTransactions(
    @Query('cheatId') cheatId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('referral') referral?: boolean,
    @Query('reseller') reseller?: boolean,
    @Query('promo') promo?: boolean,
  ) {
    try {
      return this.checkoutService.getFilteredTransactions({
        cheatId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        page: parseInt(page, 10),
        search,
        limit: parseInt(limit, 10),
        referral,
        reseller,
        promo,
      });
    } catch (error) {
      await sendErrorNotification(error);
    }
  }
}
