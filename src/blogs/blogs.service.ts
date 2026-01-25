

import { Injectable, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import slugify from 'slugify';

import { Blog } from './blog.schema';
import { CreateBlogDto } from './dto/create-blog.dto';

@Injectable()
export class BlogsService {
  constructor(
    @InjectModel(Blog.name)
    private readonly blogModel: Model<Blog>,
  ) {}

  async createBlog(dto: CreateBlogDto, tenantId: string, authorId: string) {
    try {
      const existingBlog = await this.blogModel.findOne({ tenantId });
      if (existingBlog) {
        throw new BadRequestException('You already have a blog');
      }

      const slug = slugify(dto.title, { lower: true, strict: true });
      const slugExists = await this.blogModel.findOne({ slug });
      if (slugExists) {
        throw new BadRequestException('Blog slug already exists');
      }

      const blog = new this.blogModel({
        title: dto.title,
        description: dto.description,
        content: dto.content,
        slug,
        tenantId,
        authorId,
        status: 'draft',
        publishedAt: null,
        views: 0,
        likes: 0,
      });

      return await blog.save();
    } catch (error) {
      // ✅ If it's already a NestJS HttpException, rethrow it
      if (error instanceof BadRequestException) {
        throw error;
      }

      console.error('Error creating blog:', error);
      throw new InternalServerErrorException('Failed to create blog');
    }
  }

  async getBlogBySlug(slug: string): Promise<Blog | null> {
  const blog = await this.blogModel.findOne({ slug }).exec();
  if (!blog) {
    throw new NotFoundException('Blog not found');
  }
  return blog;
  }

  async getBlogByTenant(tenantId: string): Promise<Blog | null> {
    try {
      return await this.blogModel.findOne({ tenantId }).exec();
    } catch (error) {
      console.error('Error fetching blog:', error);
      throw new InternalServerErrorException('Failed to fetch blog');
    }
  }
}
