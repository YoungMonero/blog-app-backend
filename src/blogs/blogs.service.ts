import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
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
    @InjectModel('Post') 
    private readonly postModel: Model<any>,
  ) {}

  async createBlog(
    dto: CreateBlogDto & { authorName: string },
    tenantId: string,
    authorId: string,
  ) {
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
        ...dto,
        slug,
        tenantId,
        authorId,
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

  async findAllPublished() {
    return this.blogModel.find().sort({ createdAt: -1 }).exec();
  }

  async getBlogBySlug(slug: string) {
    const blog = await this.blogModel.findOne({ slug }).lean();

    if (!blog) {
      throw new NotFoundException(`Blog with slug "${slug}" not found`);
    }

    // Fetches all published posts belonging to this blog/tenant
    const posts = await this.postModel
      .find({
        tenantId: blog.tenantId,
        status: 'published',
      })
      .sort({ createdAt: -1 })
      .lean();

    return {
      ...blog,
      posts: posts || [],
    };
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

  async updateBlog(
    id: string,
    tenantId: string,
    updateData: Partial<CreateBlogDto>,
  ) {
    const updatedBlog = await this.blogModel
      .findOneAndUpdate(
        { _id: id, tenantId },
        { $set: updateData },
        { new: true },
      )
      .exec();

    if (!updatedBlog) {
      throw new NotFoundException(
        'Blog not found or you do not have permission to edit it',
      );
    }

    return updatedBlog;
  }

  async deleteBlog(id: string, tenantId: string) {
    const result = await this.blogModel.deleteOne({ _id: id, tenantId }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(
        'Blog not found or you do not have permission to delete it',
      );
    }

    return { success: true, message: 'Blog deleted successfully' };
  }

  async uploadBlogImage(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      const uploadResult = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'blogs' },
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