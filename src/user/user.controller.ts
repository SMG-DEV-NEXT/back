import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from 'constants/roles';
import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { UserService } from './user.service';
import { AddRewardDto, UpdateUserBalanceDto, UpdateUserDto } from './dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  private getRequestLang(req: any): 'ru' | 'en' {
    const referer = (req.headers?.referer || '').toString().toLowerCase();
    if (referer.includes('/ru')) return 'ru';

    const acceptLanguage = (req.headers?.['accept-language'] || '')
      .toString()
      .toLowerCase();
    return acceptLanguage.includes('ru') ? 'ru' : 'en';
  }

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

  @Get('all')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  getAllUsers(
    @Query('search') search: string,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
  ) {
    return this.userService.getAllUsers({ search, page, limit });
  }

  @Get('profile/:id')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  getUserProfile(@Param('id') id: string) {
    return this.userService.getUserProfile(id);
  }

  @Post('profile/:id')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  updateUserProfile(
    @Param('id') id: string,
    @Body() updateData: UpdateUserDto,
    @Req() req: any,
  ) {
    return this.userService.updateUserProfile(
      id,
      updateData,
      this.getClientInfo(req),
      req?.user,
    );
  }

  @Post('balance/:id')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  updateUserBalance(
    @Param('id') id: string,
    @Body() data: UpdateUserBalanceDto,
    @Req() req: any,
  ) {
    return this.userService.updateUserBalance(
      id,
      data.balance,
      this.getClientInfo(req),
      req?.user,
    );
  }


  @Get('reward/my')
  @UseGuards(AuthGuard('jwt'))
  getMyRewards(@Req() req: any) {
    return this.userService.getUserRewards(req.user.id);
  }

  @Get('reward/:id')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  getUserRewards(@Param('id') id: string) {
    return this.userService.getUserRewards(id);
  }



  @Post('reward/:id')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  addReward(
    @Param('id') id: string,
    @Body() data: AddRewardDto,
  ) {
    return this.userService.addReward(id, data?.information || {}, !!data?.visited);
  }

  @Post('reward/visit/:rewardId')
  @UseGuards(AuthGuard('jwt'))
  visitReward(
    @Param('rewardId') rewardId: string,
    @Body() body: { lang?: string },
    @Req() req: any,
  ) {
    const bodyLang = (body?.lang || '').toString().toLowerCase();
    const lang: 'ru' | 'en' = bodyLang === 'ru' || bodyLang === 'en'
      ? (bodyLang as 'ru' | 'en')
      : this.getRequestLang(req);
    return this.userService.visitReward(req.user.id, rewardId, lang);
  }


}
