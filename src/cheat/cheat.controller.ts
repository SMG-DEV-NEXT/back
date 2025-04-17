import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  UseGuards,
  Put,
  Query,
} from '@nestjs/common';
import { CheatService } from './cheat.service';
import {
  CreateCheatDto,
  GetCheatsDto,
  ParamsFilterDto,
  ParamsIdDto,
  UpdateCheatDto,
} from './dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/roles/roles.guard';

@Controller('cheats')
export class CheatController {
  constructor(private readonly cheatService: CheatService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async create(@Body() createCheatDto: CreateCheatDto) {
    return this.cheatService.create(createCheatDto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async getAll() {
    return this.cheatService.getAll();
  }

  @Get('plans/:catalogId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async getAllWithPlans(@Param() params: ParamsFilterDto) {
    return this.cheatService.getAllWithPlans(params.catalogId);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async getById(@Param() params: ParamsIdDto) {
    return this.cheatService.getById(params.id);
  }

  @Get('view/:id')
  async getByIdClient(@Param() params: ParamsIdDto) {
    return this.cheatService.getCheatView(params.id);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async update(
    @Param() params: ParamsIdDto,
    @Body() updateCheatDto: UpdateCheatDto,
  ) {
    return this.cheatService.update(params.id, updateCheatDto);
  }

  @Delete('many')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async deleteMany(@Body() ids: string[]) {
    return this.cheatService.deleteMany(ids);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async delete(@Param() params: ParamsIdDto) {
    return this.cheatService.delete(params.id);
  }

  @Get('/api/all')
  async getCheats(@Query() query: GetCheatsDto) {
    return this.cheatService.apiCheats(query);
  }

  @Get('/api/top')
  async getTopCheats() {
    return this.cheatService.getTopCheats();
  }
}
