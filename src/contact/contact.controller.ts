import {
  Controller,
  Post,
  Put,
  Get,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { ContactService } from './contact.service';
import { CreateContactDto, UpdateContactDto } from './dto';
import sendErrorNotification from 'src/utils/sendTGError';

@Controller('contacts')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  async create(@Body() dto: CreateContactDto) {
    try {
      return this.contactService.create(dto);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateContactDto) {
    try {
      return this.contactService.update(id, dto);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get()
  async getAll() {
    try {
      return this.contactService.getAll();
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get(':id')
  async getContact(@Param('id') id: string) {
    try {
      return this.contactService.getContact(id);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    try {
      return this.contactService.delete(id);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }
}
