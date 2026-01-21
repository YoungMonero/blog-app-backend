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
//     // Generate slug from title
//     const slug = slugify(dto.title, {
//       lower: true,
//       strict: true,
//     });

//     // Ensure ONE blog per tenant
//     const existingBlog = await this.blogModel.findOne({ tenantId });
//     if (existingBlog) {
//       throw new BadRequestException('Tenant already has a blog');
//     }

//     const blog = await this.blogModel.create({
//       title: dto.title,
//       slug,
//       description: dto.description,
//       tenantId,
//     });

//     return blog;
//   }

//   async getBlogsByTenant(tenantId: string) {
//     return this.blogModel.find({ tenantId });
//   }
// // }
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

//   async getBlogsByTenant(tenantId: string) {
//     return this.blogModel.find({ tenantId });
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

  async createBlog(dto: CreateBlogDto, tenantId: string) {
    const slug = slugify(dto.title, { lower: true, strict: true });

    const existingBlog = await this.blogModel.findOne({ tenantId });
    if (existingBlog) {
      throw new BadRequestException('Tenant already has a blog');
    }

    const blog = new this.blogModel({
      title: dto.title,
      slug,
      description: dto.description,
      tenantId,
    });

    return blog.save();
  }

  async getBlogByTenant(tenantId: string): Promise<Blog | null> {
    return this.blogModel.findOne({ tenantId }).exec();
  }
}
