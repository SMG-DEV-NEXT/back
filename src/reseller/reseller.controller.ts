import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  Delete,
  UseGuards,
  Req,
  Put,
} from '@nestjs/common';
import { ResellerService } from './reseller.service';
import {
  CreateResellerDto,
  ResellerRequestDto,
  UpdateRequestDto,
  UpdateResellerDto,
} from './dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import sendErrorNotification from 'src/utils/sendTGError';
import { OptionalJwtAuthGuard } from 'src/utils/isOptionalAuth';

@Controller('resellers')
export class ResellerController {
  constructor(private readonly resellerService: ResellerService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async create(@Body() createDto: CreateResellerDto) {
    try {
      return this.resellerService.create(createDto);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async findAllPaginated(
    @Query('skip') skip = '0',
    @Query('take') take = '10',
  ) {
    try {
      return this.resellerService.findAllPaginated(Number(skip), Number(take));
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get('raw')
  async findAllRaw() {
    try {
      return this.resellerService.findAllRaw();
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Post('/request')
  async request(@Body() dto: ResellerRequestDto) {
    try {
      return this.resellerService.request(dto);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Put('/request')
  async requestUpdate(@Body() dto: UpdateRequestDto) {
    try {
      const { id, ...data } = dto;
      return this.resellerService.updateRequest(id, data);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get('/request')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async getAllRequests(@Query('skip') skip = '0', @Query('take') take = '10') {
    try {
      return this.resellerService.getAllRequests(Number(skip), Number(take));
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Delete('/request/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async removeRequest(@Param('id') id: string) {
    try {
      return this.resellerService.removeRequest(id);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Post('/check')
  @UseGuards(OptionalJwtAuthGuard)
  async check(@Body() { email }: { email: string }, @Req() req: any) {
    try {
      const user = req.user;
      const res = await this.resellerService.check(email);
      if (user && res?.email !== user?.email) {
        return null;
      }
      return res;
    } catch (error) {
      await sendErrorNotification(error);
    }
  }
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return this.resellerService.findOne(id);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async update(@Param('id') id: string, @Body() updateDto: UpdateResellerDto) {
    try {
      return this.resellerService.update(id, updateDto);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async remove(@Param('id') id: string) {
    try {
      return this.resellerService.remove(id);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }
}
