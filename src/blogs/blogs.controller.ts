
    
import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Req,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BlogsService } from './blogs.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import type { AuthRequest } from 'src/auth/type/auth-request.type';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('blogs')
@UseGuards(JwtAuthGuard)
export class BlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  /* ================= BLOG ================= */

  @Post()
  async createBlog(@Body() body: CreateBlogDto, @Req() req: AuthRequest) {
    return this.blogsService.createBlog(
      body,
      req.user.tenantId,
      req.user.userId,
    );
  }

  @Get('me')
  async getMyBlog(@Req() req: AuthRequest) {
    const blog = await this.blogsService.getBlogByTenant(req.user.tenantId);
    return { blog: blog ?? null };
  }

  @Patch('me')
  async updateMyBlog(
    @Body()
    body: {
      coverImage?: string;
      profileImage?: string;
    },
    @Req() req: AuthRequest,
  ) {
    return this.blogsService.updateBlogImages(
      req.user.tenantId,
      body,
    );
  }

  /* ================= BLOG IMAGES ================= */

  @Post('images')
  @UseInterceptors(FileInterceptor('file'))
  async uploadBlogImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // ⬇️ Delegate upload to service (Cloudinary)
    return this.blogsService.uploadBlogImage(file);
  }
}
