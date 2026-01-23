
import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BlogsService } from './blogs.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import type { AuthRequest } from 'src/auth/type/auth-request.type';

@Controller('blogs')
@UseGuards(JwtAuthGuard)
export class BlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  @Post()
  async createBlog(@Body() body: CreateBlogDto, @Req() req: AuthRequest) {
    const tenantId = req.user.tenantId;
    const authorId = req.user.userId;
    // ✅ Let service handle exceptions properly
    return await this.blogsService.createBlog(body, tenantId, authorId);
  }

  @Get('me')
  async getMyBlog(@Req() req: AuthRequest) {
    const tenantId = req.user.tenantId;
    const blog = await this.blogsService.getBlogByTenant(tenantId);

    // ✅ Always return JSON, even if no blog exists
    if (!blog) {
      return { blog: null };
    }

    return { blog };
  }
}
