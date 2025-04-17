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

@Controller('promocode')
export class PromocodeController {
  constructor(private readonly service: PromocodeService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  create(@Body() dto: CreatePromocodeDto) {
    return this.service.create(dto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  getAll(@Query('page') page = 1, @Query('limit') limit = 30) {
    return this.service.getAll(Number(page), Number(limit));
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  getOne(@Param('id') id: string) {
    return this.service.getOne(id);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  update(@Param('id') id: string, @Body() dto: UpdatePromocodeDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  @Get('check/:code')
  check(@Param('code') code: string) {
    return this.service.check(code);
  }
}
