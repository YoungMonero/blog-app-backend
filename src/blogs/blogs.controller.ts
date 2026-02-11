// blogs.controller.ts

import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Delete,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BlogsService } from './blogs.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import type { AuthRequest } from 'src/auth/type/auth-request.type';
import { FileInterceptor } from '@nestjs/platform-express';
import { SetMetadata } from '@nestjs/common';
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

@Controller('blogs')
export class BlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  @Public() 
  @Get('public/:slug')
  async getPublicBlog(@Param('slug') slug: string) {
    return this.blogsService.getBlogBySlug(slug);
  }

  @Get()
  async getAllBlogs() {
    return this.blogsService.findAllPublished();
  }

  @Get('post/:slug')
  async getBlogBySlug(@Param('slug') slug: string) {
    return this.blogsService.getBlogBySlug(slug);
  }

  // --- PROTECTED ROUTES (Token Required) ---

  @UseGuards(JwtAuthGuard)
  @Post()
  async createBlog(@Body() body: CreateBlogDto, @Req() req: AuthRequest) {

    const authorName = req.user.username || body.authorName || 'Anonymous'; 
    
    return this.blogsService.createBlog(
      { ...body, authorName }, // Pass the authorName to the service
      req.user.tenantId,
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMyBlog(@Req() req: AuthRequest) {
    const blog = await this.blogsService.getBlogByTenant(req.user.tenantId);
    return { blog: blog ?? null };
  }

  // Update specific images (banner/avatar)
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMyBlogImages(
    @Body() body: { coverImage?: string; profileImage?: string },
    @Req() req: AuthRequest,
  ) {
    return this.blogsService.updateBlogImages(req.user.tenantId, body);
  }

  // Update general blog content (title, description, etc.)
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async updateBlog(
    @Param('id') id: string,
    @Body() body: Partial<CreateBlogDto>,
    @Req() req: AuthRequest,
  ) {
    return this.blogsService.updateBlog(id, req.user.tenantId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteBlog(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.blogsService.deleteBlog(id, req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('images')
  @UseInterceptors(FileInterceptor('file'))
  async uploadBlogImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.blogsService.uploadBlogImage(file);
  }
}