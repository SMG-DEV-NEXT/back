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
import sendErrorNotification from 'src/utils/sendTGError';

@Controller('cheats')
export class CheatController {
  constructor(private readonly cheatService: CheatService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async create(@Body() createCheatDto: CreateCheatDto) {
    try {
      return this.cheatService.create(createCheatDto);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get('head/:search')
  async searchCheat(@Param() params: { search: string }) {
    try {
      return this.cheatService.searchCheat(params.search);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async getAll() {
    try {
      return this.cheatService.getAll();
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get('plans/:catalogId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async getAllWithPlans(@Param() params: ParamsFilterDto) {
    try {
      return this.cheatService.getAllWithPlans(params.catalogId);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async getById(@Param() params: ParamsIdDto) {
    try {
      return this.cheatService.getById(params.id);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get('view/:id')
  async getByIdClient(@Param() params: ParamsIdDto, @Query('ref') ref) {
    try {
      return this.cheatService.getCheatView(params.id, ref);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async update(
    @Param() params: ParamsIdDto,
    @Body() updateCheatDto: UpdateCheatDto,
  ) {
    try {
      return this.cheatService.update(params.id, updateCheatDto);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Delete('many')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async deleteMany(@Body() ids: string[]) {
    try {
      return this.cheatService.deleteMany(ids);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async delete(@Param() params: ParamsIdDto) {
    try {
      return this.cheatService.delete(params.id);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get('/api/all')
  async getCheats(@Query() query: GetCheatsDto) {
    try {
      return this.cheatService.apiCheats(query);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get('/api/top')
  async getTopCheats() {
    try {
      return this.cheatService.getTopCheats();
    } catch (error) {
      await sendErrorNotification(error);
    }
  }
}
