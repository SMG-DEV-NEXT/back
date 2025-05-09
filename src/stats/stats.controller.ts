import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { StatsService } from './stats.service';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import {
  CreateStatDto,
  GetAllStatsDto,
  GetAllStatsOfCatalog,
  UpdateStatsDto,
} from './dto';
import { AuthGuard } from '@nestjs/passport';
import sendErrorNotification from 'src/utils/sendTGError';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  // 1. Get all games with count of stats
  @Get('/games')
  async getAllGamesWithStatsCount() {
    try {
      return this.statsService.getAllGamesWithStatsCount();
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  //3. get stats of catalog
  @Get('/game/:id')
  async getStatsOfCatalog(
    @Param() params: { id: string },
    @Query() query: GetAllStatsOfCatalog,
  ) {
    try {
      return this.statsService.getAllStatsClient(params.id, query);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  // 2. Get all stats of a catalog
  @Get('/admin')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async getAllStats(@Query() query: GetAllStatsDto) {
    try {
      return this.statsService.getAllStats(query);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get('/top')
  async getTopStats() {
    try {
      return this.statsService.getTopStats();
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get('/:id')
  async getStat(@Param() params: { id: string }) {
    try {
      return this.statsService.getStatWithCatalog(params.id, false);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get('/api/:id')
  async getStatUser(@Param() params: { id: string }) {
    try {
      return this.statsService.getStatWithCatalog(params.id, true);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  // 4. Create a stat for a game (Only Admin)
  @UseGuards(RolesGuard)
  @Post('/')
  async createStat(@Body() createStatsDto: CreateStatDto) {
    try {
      return this.statsService.createStatForGame(
        createStatsDto.catalogId,
        createStatsDto,
      );
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  // 5. Update a stat (Only Admin)
  @UseGuards(RolesGuard)
  @Patch('/:statId')
  async updateStat(
    @Param('statId') statId: string,
    @Body() updateStatsDto: UpdateStatsDto,
  ) {
    try {
      return this.statsService.updateStat(statId, updateStatsDto);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }
}
