import { Controller, Post, Get, Param, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CommentsService } from './comments.service';

@Controller('posts/:postId')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post('comments') 
  @UseGuards(JwtAuthGuard)
  async addComment(
    @Param('postId') postId: string,
    @Body() body: { content: string, parentCommentId?: string },
    @Req() req,
  ) {
    const userId = req.user.sub || req.user.userId;
    const username = req.user.displayName || req.user.username || req.user.name || "Anonymous";
    const userRole = req.user.role || 'reader';

    return this.commentsService.create({
      content: body.content,
      postId,
      parentCommentId: body.parentCommentId,
      userId,
      authorName: username,
      authorRole: userRole,
    });
  }

  @Get('comments')  
  async getComments(@Param('postId') postId: string) {
    return this.commentsService.findByPost(postId);
  }

  @Post('like')  
  @UseGuards(JwtAuthGuard)
  async toggleLike(@Param('postId') postId: string, @Req() req) {
    const userId = req.user.sub || req.user.userId;
    return this.commentsService.toggleLike(postId, userId);
  }

  @Post('comments/:commentId/like')
  @UseGuards(JwtAuthGuard)
  async toggleCommentLike(
    @Param('commentId') commentId: string,
    @Req() req,
  ) {
    const userId = req.user.sub || req.user.userId;
    return this.commentsService.toggleCommentLike(commentId, userId);
  }
}