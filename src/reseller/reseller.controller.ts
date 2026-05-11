import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  Delete,
  UseGuards,
  Req,
  Put,
} from '@nestjs/common';
import { ResellerService } from './reseller.service';
import {
  CreateResellerDto,
  ResellerRequestDto,
  UpdateRequestDto,
  UpdateResellerDto,
} from './dto';
import { Role } from 'constants/roles';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import sendErrorNotification from 'src/utils/sendTGError';
import { OptionalJwtAuthGuard } from 'src/utils/isOptionalAuth';
import { AuditService } from 'src/audit/audit.service';
import { AuditAction } from 'constants/audit-actions';
import { getAuditCtx } from 'src/utils/audit-ctx';

@Controller('resellers')
export class ResellerController {
  constructor(
    private readonly resellerService: ResellerService,
    private readonly audit: AuditService,
  ) {}

  @Post()
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async create(@Body() createDto: CreateResellerDto, @Req() req: any) {
    try {
      const result = await this.resellerService.create(createDto);
      void this.audit.logAdmin(AuditAction.ADMIN_CREATE, getAuditCtx(req), {
        adminId: req.user?.id,
        entity: 'Reseller',
        metadata: { id: (result as any)?.id, email: createDto?.email },
      });
      return result;
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get()
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async findAllPaginated(
    @Query('skip') skip = '0',
    @Query('take') take = '10',
  ) {
    try {
      return this.resellerService.findAllPaginated(Number(skip), Number(take));
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get('raw')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async findAllRaw() {
    try {
      return this.resellerService.findAllRaw();
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Post('/request')
  async request(@Body() dto: ResellerRequestDto) {
    try {
      return this.resellerService.request(dto);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Put('/request')
  async requestUpdate(@Body() dto: UpdateRequestDto) {
    try {
      const { id, ...data } = dto;
      return this.resellerService.updateRequest(id, data);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get('/request')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async getAllRequests(@Query('skip') skip = '0', @Query('take') take = '10') {
    try {
      return this.resellerService.getAllRequests(Number(skip), Number(take));
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Delete('/request/:id')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async removeRequest(@Param('id') id: string, @Req() req: any) {
    try {
      const result = await this.resellerService.removeRequest(id);
      void this.audit.logAdmin(AuditAction.ADMIN_DELETE, getAuditCtx(req), {
        adminId: req.user?.id,
        entity: 'ResellerRequest',
        metadata: { id },
      });
      return result;
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Post('/check')
  @UseGuards(OptionalJwtAuthGuard)
  async check(@Body() { email }: { email: string }, @Req() req: any) {
    try {
      const user = req.user;
      const res = await this.resellerService.check(email);
      if (user && res?.email !== user?.email) {
        return null;
      }
      return res;
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return this.resellerService.findOne(id);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateResellerDto,
    @Req() req: any,
  ) {
    try {
      const result = await this.resellerService.update(id, updateDto);
      void this.audit.logAdmin(AuditAction.ADMIN_UPDATE, getAuditCtx(req), {
        adminId: req.user?.id,
        entity: 'Reseller',
        metadata: { id },
      });
      return result;
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async remove(@Param('id') id: string, @Req() req: any) {
    try {
      const result = await this.resellerService.remove(id);
      void this.audit.logAdmin(AuditAction.ADMIN_DELETE, getAuditCtx(req), {
        adminId: req.user?.id,
        entity: 'Reseller',
        metadata: { id },
      });
      return result;
    } catch (error) {
      await sendErrorNotification(error);
    }
  }
}
