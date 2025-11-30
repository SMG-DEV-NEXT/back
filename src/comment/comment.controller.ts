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
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { CommentService } from './comment.service';
import {
  CommentCreate,
  getComment,
  GetCommentsDto,
  UpdateComment,
} from './dto';
import sendErrorNotification from 'src/utils/sendTGError';

@Controller('comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

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
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async deleteComment(@Param() params: { id: string }) {
    try {
      return this.commentService.remove(params.id);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async getComments(@Query() query: GetCommentsDto) {
    try {
      return this.commentService.getFilteredComments(query);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async getComment(@Param() params: getComment) {
    try {
      return this.commentService.getComment(params.id);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async saveComment(@Param() params: getComment, @Body() dto: UpdateComment) {
    try {
      return this.commentService.saveComment(params.id, dto);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }
}
