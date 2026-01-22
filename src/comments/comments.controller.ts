import { Controller, Post, Get, Param, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CommentsService } from './comments.service'; 

@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post('posts/:postId/comments')
  @UseGuards(JwtAuthGuard)
  async addComment(
    @Param('postId') postId: string,
    @Body() body: { content: string },
    @Req() req,
  ) {
    const userId = req.user.sub || req.user.userId;
    const username = req.user.username;

    return this.commentsService.create({
      content: body.content,
      postId,
      userId,
      authorName: username,
      authorRole: req.user.role,
    });
  }

  @Get('posts/:postId/comments')
  async getComments(@Param('postId') postId: string) {
    return this.commentsService.findByPost(postId);
  }

  @Post('posts/:postId/like')
  @UseGuards(JwtAuthGuard)
  async toggleLike(@Param('postId') postId: string, @Req() req) {
    const userId = req.user.sub || req.user.userId;
    return this.commentsService.toggleLike(postId, userId);
  }
}