import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('all')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  getAllUsers(
    @Query('search') search: string,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
  ) {
    return this.userService.getAllUsers({ search, page, limit });
  }

  @Get('profile/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  getUserProfile(@Param('id') id: string) {
    return this.userService.getUserProfile(id);
  }

  @Post('profile/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  updateUserProfile(
    @Param('id') id: string,
    @Body() updateData: UpdateUserDto,
  ) {
    return this.userService.updateUserProfile(id, updateData);
  }
}
