import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
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
import { Request } from 'express';

@Controller('comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post('create')
  @UseGuards(AuthGuard('jwt'))
  createPost(@Body() dto: CommentCreate, @Req() req: any) {
    const user = req.user;
    return this.commentService.create(dto, user);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  getComments(@Query() query: GetCommentsDto) {
    return this.commentService.getFilteredComments(query);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  getComment(@Param() params: getComment) {
    return this.commentService.getComment(params.id);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  saveComment(@Param() params: getComment, @Body() dto: UpdateComment) {
    return this.commentService.saveComment(params.id, dto);
  }
}
