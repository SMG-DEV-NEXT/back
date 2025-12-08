import {
  Controller,
  Post,
  Get,
  Delete,
  Query,
  Param,
  Body,
  UseGuards,
  Put,
} from '@nestjs/common';
import { PromocodeService } from './promocode.service';
import { CreatePromocodeDto, UpdatePromocodeDto } from './dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import sendErrorNotification from 'src/utils/sendTGError';

@Controller('promocode')
export class PromocodeController {
  constructor(private readonly service: PromocodeService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async create(@Body() dto: CreatePromocodeDto) {
    try {
      return this.service.create(dto);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async getAll(@Query('page') page = 1, @Query('limit') limit = 30) {
    try {
      return this.service.getAll(Number(page), Number(limit));
    } catch (error) {
      await sendErrorNotification(error);
    }
  }
  @Post('check')
  async check(@Body() body: { code: string }) {
    try {
      return this.service.check(body.code);
    } catch (error) {
      console.log(error);
      await sendErrorNotification(error);
    }
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async getOne(@Param('id') id: string) {
    try {
      return this.service.getOne(id);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async update(@Param('id') id: string, @Body() dto: UpdatePromocodeDto) {
    try {
      return this.service.update(id, dto);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async delete(@Param('id') id: string) {
    try {
      return this.service.delete(id);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }
}
