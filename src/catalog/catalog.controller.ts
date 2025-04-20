import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { Prisma } from '@prisma/client';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { CreateDto } from './dto';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}
  @Get('/top')
  async getTopCatalogs() {
    return this.catalogService.getTopCatalogs();
  }
  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async createCatalog(@Body() data: CreateDto) {
    return this.catalogService.createCatalog(data);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async updateCatalog(
    @Param('id') id: string,
    @Body() data: Prisma.CatalogUpdateInput,
  ) {
    return this.catalogService.updateCatalog(id, data);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async getAllCatalogs() {
    return this.catalogService.getAllCatalogs();
  }

  @Get('/all')
  async getCatalogs(
    @Query('search') search?: string,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
  ) {
    return this.catalogService.getCatalogsWithCheats({ search, page, limit });
  }

  @Get(':id')
  async getCatalog(@Param('id') id: string) {
    return this.catalogService.getCatalog(id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async deleteCatalog(@Param('id') id: string) {
    return this.catalogService.deleteCatalog(id);
  }

  @Delete()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async deleteMultipleCatalogs(@Body('ids') ids: string[]) {
    return this.catalogService.deleteMultipleCatalogs(ids);
  }
}
