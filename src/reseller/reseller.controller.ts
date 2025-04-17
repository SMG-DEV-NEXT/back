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
} from '@nestjs/common';
import { ResellerService } from './reseller.service';
import { CreateResellerDto, UpdateResellerDto } from './dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/roles/roles.guard';

@Controller('resellers')
export class ResellerController {
  constructor(private readonly resellerService: ResellerService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  create(@Body() createDto: CreateResellerDto) {
    return this.resellerService.create(createDto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  findAllPaginated(@Query('skip') skip = '0', @Query('take') take = '10') {
    return this.resellerService.findAllPaginated(Number(skip), Number(take));
  }

  @Get('raw')
  findAllRaw() {
    return this.resellerService.findAllRaw();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resellerService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  update(@Param('id') id: string, @Body() updateDto: UpdateResellerDto) {
    return this.resellerService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  remove(@Param('id') id: string) {
    return this.resellerService.remove(id);
  }

  @Post('/check')
  check(@Body() { email }: { email: string }) {
    return this.resellerService.check(email);
  }
}
