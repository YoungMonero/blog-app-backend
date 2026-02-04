import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import slugify from 'slugify';

import { Blog } from './blog.schema';
import { CreateBlogDto } from './dto/create-blog.dto';

import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

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
      });

      return await blog.save();
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      console.error(error);
      throw new InternalServerErrorException('Failed to create blog');
    }
  }

  async getBlogByTenant(tenantId: string): Promise<Blog | null> {
    return this.blogModel.findOne({ tenantId }).exec();
  }

  async updateBlogImages(
    tenantId: string,
    data: {
      coverImage?: string;
      profileImage?: string;
    },
  ) {
    const blog = await this.blogModel.findOne({ tenantId });

    if (!blog) {
      throw new BadRequestException('Blog not found');
    }

    if (data.coverImage !== undefined) {
      blog.coverImage = data.coverImage;
    }

    if (data.profileImage !== undefined) {
      blog.profileImage = data.profileImage;
    }

    return blog.save();
  }



  async uploadBlogImage(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      const uploadResult = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'blogs',
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          },
        );

        Readable.from(file.buffer).pipe(uploadStream);
      });

      return {
        success: true,
        data: {
          url: uploadResult.secure_url,
        },
      };
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Image upload failed');
    }
  }
}
