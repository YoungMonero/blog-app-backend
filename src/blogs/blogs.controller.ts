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
  async createBlog(
    @Body() body: CreateBlogDto,
    @Req() req: AuthRequest,
  ) {
    const tenantId = req.user.tenantId;
    // ✅ Pass arguments separately
    return this.blogsService.createBlog(body, tenantId);
  }

  @Get('me')
  async getMyBlogs(@Req() req: AuthRequest) {
    const tenantId = req.user.tenantId;
    return this.blogsService.getBlogsByTenant(tenantId);
  }
}
