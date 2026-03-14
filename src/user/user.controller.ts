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
import { UpdateUserBalanceDto, UpdateUserDto } from './dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

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
}
