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
import sendErrorNotification from 'src/utils/sendTGError';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}
  @Get('/top')
  async getTopCatalogs() {
    try {
      return this.catalogService.getTopCatalogs();
    } catch (error) {
      await sendErrorNotification(error);
    }
  }
  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async createCatalog(@Body() data: CreateDto) {
    try {
      return this.catalogService.createCatalog(data);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async updateCatalog(
    @Param('id') id: string,
    @Body() data: Prisma.CatalogUpdateInput,
  ) {
    try {
      return this.catalogService.updateCatalog(id, data);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async getAllCatalogs() {
    try {
      return this.catalogService.getAllCatalogs();
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get('/published')
  async getAllPublished() {
    try {
      return this.catalogService.getAllPublishedCatalogs();
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get('/all')
  async getCatalogs(
    @Query('search') search?: string,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
  ) {
    try {
      return this.catalogService.getCatalogsWithCheats({ search, page, limit });
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get('/admin/:id')
  async getCatalogAdmin(@Param('id') id: string) {
    try {
      return this.catalogService.getCatalogAdmin(id);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get(':id')
  async getCatalog(@Param('id') id: string) {
    try {
      return this.catalogService.getCatalog(id);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async deleteCatalog(@Param('id') id: string) {
    try {
      return this.catalogService.deleteCatalog(id);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Delete()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async deleteMultipleCatalogs(@Body('ids') ids: string[]) {
    try {
      return this.catalogService.deleteMultipleCatalogs(ids);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }
}
