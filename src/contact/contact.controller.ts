import {
  Controller,
  Post,
  Put,
  Get,
  Delete,
  Param,
  Body,
  Req,
} from '@nestjs/common';
import { ContactService } from './contact.service';
import { CreateContactDto, UpdateContactDto } from './dto';
import sendErrorNotification from 'src/utils/sendTGError';
import { AuditService } from 'src/audit/audit.service';
import { AuditAction } from 'constants/audit-actions';
import { getAuditCtx } from 'src/utils/audit-ctx';

@Controller('contacts')
export class ContactController {
  constructor(
    private readonly contactService: ContactService,
    private readonly audit: AuditService,
  ) {}

  @Post()
  async create(@Body() dto: CreateContactDto, @Req() req: any) {
    try {
      const result = await this.contactService.create(dto);
      void this.audit.logAdmin(AuditAction.ADMIN_CREATE, getAuditCtx(req), {
        adminId: req.user?.id,
        entity: 'Contact',
        metadata: { id: (result as any)?.id },
      });
      return result;
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateContactDto,
    @Req() req: any,
  ) {
    try {
      const result = await this.contactService.update(id, dto);
      void this.audit.logAdmin(AuditAction.ADMIN_UPDATE, getAuditCtx(req), {
        adminId: req.user?.id,
        entity: 'Contact',
        metadata: { id },
      });
      return result;
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
  async delete(@Param('id') id: string, @Req() req: any) {
    try {
      const result = await this.contactService.delete(id);
      void this.audit.logAdmin(AuditAction.ADMIN_DELETE, getAuditCtx(req), {
        adminId: req.user?.id,
        entity: 'Contact',
        metadata: { id },
      });
      return result;
    } catch (error) {
      await sendErrorNotification(error);
    }
  }
}
