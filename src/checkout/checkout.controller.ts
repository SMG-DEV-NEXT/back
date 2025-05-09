import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CheckoutDto } from './dto';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import sendErrorNotification from 'src/utils/sendTGError';

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post()
  async checkout(@Body() data: CheckoutDto, @Req() req: Request) {
    try {
      const ip =
        req.headers['x-forwarded-for']?.toString().split(',')[0] || // If behind proxy
        req.socket.remoteAddress;
      return this.checkoutService.checkoutFunction(data, ip);
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
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    try {
      return this.checkoutService.getFilteredTransactions({
        cheatId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      });
    } catch (error) {
      await sendErrorNotification(error);
    }
  }
}
