import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from 'constants/roles';
import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { CommentService } from './comment.service';
import {
  CommentCreate,
  getComment,
  GetCommentsDto,
  UpdateComment,
} from './dto';
import sendErrorNotification from 'src/utils/sendTGError';
import { AuditService } from 'src/audit/audit.service';
import { AuditAction } from 'constants/audit-actions';
import { getAuditCtx } from 'src/utils/audit-ctx';

@Controller('comments')
export class CommentController {
  constructor(
    private readonly commentService: CommentService,
    private readonly audit: AuditService,
  ) {}

  @Post('create')
  @UseGuards(AuthGuard('jwt'))
  async createComment(@Body() dto: CommentCreate, @Req() req: any) {
    try {
      const user = req.user;
      return this.commentService.create(dto, user);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Delete('remove/:id')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async deleteComment(@Param() params: { id: string }, @Req() req: any) {
    try {
      const result = await this.commentService.remove(params.id);
      void this.audit.logAdmin(AuditAction.ADMIN_DELETE, getAuditCtx(req), {
        adminId: req.user?.id,
        entity: 'Comment',
        metadata: { id: params.id },
      });
      return result;
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get()
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async getComments(@Query() query: GetCommentsDto) {
    try {
      return this.commentService.getFilteredComments(query);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async getComment(@Param() params: getComment) {
    try {
      return this.commentService.getComment(params.id);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async saveComment(
    @Param() params: getComment,
    @Body() dto: UpdateComment,
    @Req() req: any,
  ) {
    try {
      const result = await this.commentService.saveComment(params.id, dto);
      void this.audit.logAdmin(AuditAction.ADMIN_UPDATE, getAuditCtx(req), {
        adminId: req.user?.id,
        entity: 'Comment',
        metadata: { id: params.id },
      });
      return result;
    } catch (error) {
      await sendErrorNotification(error);
    }
  }
}
