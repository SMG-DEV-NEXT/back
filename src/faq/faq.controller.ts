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
import sendErrorNotification from 'src/utils/sendTGError';

@Controller('faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('admin/init')
  async initBlocks() {
    try {
      return this.faqService.initBlocks();
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('admin/block/:id')
  async getBlock(@Param('id') id: string) {
    try {
      return this.faqService.getBlockFaq(id);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('admin/block/:id')
  async updateBlock(@Param('id') id: string, @Body() dto: UpdateBlockDto) {
    try {
      return this.faqService.updateBlockFaq(id, dto);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('admin/stat')
  async createStat(@Body() dto: CreateStatDto) {
    try {
      return this.faqService.createStat(dto);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch('admin/stat/:id')
  async updateStat(@Param('id') id: string, @Body() dto: UpdateStatDto) {
    try {
      return this.faqService.updateStat(id, dto);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('admin/stat/:id')
  async getStat(@Param('id') id: string) {
    try {
      return this.faqService.getStatById(id);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('admin/faq')
  async getAdminFaq() {
    try {
      return this.faqService.getAllFaq();
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get('client/faq')
  async getClientFaq() {
    try {
      return this.faqService.getAllFaq();
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get('stats')
  async getAllStats() {
    try {
      return this.faqService.getAllStats();
    } catch (error) {
      await sendErrorNotification(error);
    }
  }
}
