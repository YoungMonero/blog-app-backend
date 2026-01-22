

// import { Injectable, BadRequestException } from '@nestjs/common';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model } from 'mongoose';
// import slugify from 'slugify';

// import { Blog } from './blog.schema';
// import { CreateBlogDto } from './dto/create-blog.dto';

// @Injectable()
// export class BlogsService {
//   constructor(
//     @InjectModel(Blog.name)
//     private readonly blogModel: Model<Blog>,
//   ) {}

//   async createBlog(dto: CreateBlogDto, tenantId: string) {
//     const slug = slugify(dto.title, { lower: true, strict: true });

//     const existingBlog = await this.blogModel.findOne({ tenantId });
//     if (existingBlog) {
//       throw new BadRequestException('Tenant already has a blog');
//     }

//     const blog = new this.blogModel({
//       title: dto.title,
//       slug,
//       description: dto.description,
//       tenantId,
//     });

//     return blog.save();
//   }

//   // ✅ single blog per tenant
//   async getBlogByTenant(tenantId: string): Promise<Blog | null> {
//     return this.blogModel.findOne({ tenantId }).exec();
//   }
// }


import { Injectable, BadRequestException } from '@nestjs/common';
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

  // ✅ Create blog (ONE blog per tenant)
  async createBlog(dto: CreateBlogDto, tenantId: string) {
    // 🚫 Prevent multiple blogs per tenant
    const existingBlog = await this.blogModel.findOne({ tenantId });

    if (existingBlog) {
      throw new BadRequestException('You already have a blog');
    }

    // ✅ Generate slug automatically
    const slug = slugify(dto.title, { lower: true, strict: true });

    // 🚫 Prevent duplicate slugs globally
    const slugExists = await this.blogModel.findOne({ slug });
    if (slugExists) {
      throw new BadRequestException('Blog slug already exists');
    }

    return this.blogModel.create({
      title: dto.title,
      description: dto.description,
      slug,
      tenantId,
    });
  }

  async getBlogByTenant(tenantId: string): Promise<Blog | null> {
    return this.blogModel.findOne({ tenantId }).exec();
  }
}
