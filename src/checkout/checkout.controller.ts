import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CheckoutDto, CreatePaymentDto } from './dto';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import sendErrorNotification from 'src/utils/sendTGError';
import * as crypto from 'crypto';
import { Transaction } from 'mongodb';
import { generateTransaction } from 'src/utils/generateTransaction';

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}
  @Post()
  async checkout(@Body() data: CheckoutDto, @Req() req: any) {
    try {
      const user = await req.user;
      const ip =
        req.headers['x-forwarded-for']?.toString().split(',')[0] || // If behind proxy
        req.socket.remoteAddress;
      return this.checkoutService.initiatePayment(data, ip, user);
    } catch (error) {
      await sendErrorNotification(error);
    }
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
      );
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Post('/callback')
  @HttpCode(200)
  async paymentCallback(@Body() body: any) {
    await this.checkoutService.handleCallback(body);
    return { success: true };
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

  @Get('/:id')
  async getTransactionPreview(@Param() param) {
    try {
      return this.checkoutService.getTransactionPreview(param.id);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get()
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
