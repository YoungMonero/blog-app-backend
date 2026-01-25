import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  Param,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BlogsService } from './blogs.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import type { AuthRequest } from 'src/auth/type/auth-request.type';

@Controller('blogs')
export class BlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  @Get('slug/:slug')
  async getBlogBySlug(@Param('slug') slug: string) {
    return await this.blogsService.getBlogBySlug(slug);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async createBlog(@Body() body: CreateBlogDto, @Req() req: AuthRequest) {
    const tenantId = req.user.tenantId;
    const authorId = req.user.userId;
    return await this.blogsService.createBlog(body, tenantId, authorId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMyBlog(@Req() req: AuthRequest) {
    const tenantId = req.user.tenantId;
    const blog = await this.blogsService.getBlogByTenant(tenantId);
    if (!blog) return { blog: null };
    return { blog };
  }
}