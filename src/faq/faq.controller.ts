import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { FaqService } from './faq.service';
import { CreateStatDto, UpdateBlockDto } from './dto';
import { UpdateStatDto } from './dto';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { AuthGuard } from '@nestjs/passport';

@Controller('faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('admin/init')
  initBlocks() {
    return this.faqService.initBlocks();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('admin/block/:id')
  getBlock(@Param('id') id: string) {
    return this.faqService.getBlockFaq(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('admin/block/:id')
  updateBlock(@Param('id') id: string, @Body() dto: UpdateBlockDto) {
    return this.faqService.updateBlockFaq(id, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('admin/stat')
  createStat(@Body() dto: CreateStatDto) {
    return this.faqService.createStat(dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch('admin/stat/:id')
  updateStat(@Param('id') id: string, @Body() dto: UpdateStatDto) {
    return this.faqService.updateStat(id, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('admin/stat/:id')
  getStat(@Param('id') id: string) {
    return this.faqService.getStatById(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('admin/faq')
  getAdminFaq() {
    return this.faqService.getAllFaq();
  }

  @Get('client/faq')
  getClientFaq() {
    return this.faqService.getAllFaq();
  }

  @Get('stats')
  getAllStats() {
    return this.faqService.getAllStats();
  }
}
