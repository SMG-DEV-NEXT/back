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

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  // 1. Get all games with count of stats
  @Get('/games')
  async getAllGamesWithStatsCount() {
    return this.statsService.getAllGamesWithStatsCount();
  }

  //3. get stats of catalog
  @Get('/game/:id')
  async getStatsOfCatalog(
    @Param() params: { id: string },
    @Query() query: GetAllStatsOfCatalog,
  ) {
    return this.statsService.getAllStatsClient(params.id, query);
  }

  // 2. Get all stats of a catalog
  @Get('/admin')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async getAllStats(@Query() query: GetAllStatsDto) {
    return this.statsService.getAllStats(query);
  }

  @Get('/top')
  async getTopStats() {
    return this.statsService.getTopStats();
  }

  @Get('/:id')
  async getStat(@Param() params: { id: string }) {
    return this.statsService.getStatWithCatalog(params.id, false);
  }

  @Get('/api/:id')
  async getStatUser(@Param() params: { id: string }) {
    return this.statsService.getStatWithCatalog(params.id, true);
  }

  // 4. Create a stat for a game (Only Admin)
  @UseGuards(RolesGuard)
  @Post('/')
  async createStat(@Body() createStatsDto: CreateStatDto) {
    return this.statsService.createStatForGame(
      createStatsDto.catalogId,
      createStatsDto,
    );
  }

  // 5. Update a stat (Only Admin)
  @UseGuards(RolesGuard)
  @Patch('/:statId')
  async updateStat(
    @Param('statId') statId: string,
    @Body() updateStatsDto: UpdateStatsDto,
  ) {
    return this.statsService.updateStat(statId, updateStatsDto);
  }
}
