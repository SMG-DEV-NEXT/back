import { ReferralService } from './referral.service';
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  UseGuards,
  Query,
  Delete,
} from '@nestjs/common';
import { CreateReferralDto, UpdateReferralDto } from './dto';
import { Role } from 'constants/roles';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import sendErrorNotification from 'src/utils/sendTGError';

@Controller('referral')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) { }

  @Post()
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  create(@Body() dto: CreateReferralDto) {
    return this.referralService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  update(@Param('id') id: string, @Body() dto: UpdateReferralDto) {
    return this.referralService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async delete(@Param('id') id: string) {
    try {
      return this.referralService.delete(id);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get()
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async getAll(@Query('page') page = 1, @Query('limit') limit = 30) {
    try {
      return this.referralService.getAll(Number(page), Number(limit));
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get('admin/:ownerId')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  getAdminReferrals(@Param('ownerId') ownerId: string) {
    return this.referralService.findByOwner(ownerId);
  }

  @Get('check/:code')
  checkReferral(@Param('code') code: string) {
    return this.referralService.checkCode(code);
  }

  @Post('track-view/:code')
  trackReferralView(@Param('code') code: string) {
    return this.referralService.incrementViewByCode(code);
  }

  @Get('/:id')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async getById(@Param('id') id: string) {
    try {
      return this.referralService.getById(id);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }
}
