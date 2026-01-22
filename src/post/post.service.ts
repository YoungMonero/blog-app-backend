import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import slugify from 'slugify';
import { Post, PostDocument } from './post.schema';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';


@Injectable()
export class PostService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>
  ) {}

  async create(dto: CreatePostDto, userId: string, tenantId: string): Promise<Post> {
    const slug = slugify(dto.title, { lower: true, strict: true });
    
    const post = new this.postModel({
      ...dto,
      slug,
      authorId: new Types.ObjectId(userId),
      tenantId: new Types.ObjectId(tenantId),
      status: dto.status || 'draft',
      publishedAt: dto.status === 'published' ? new Date() : null,
    });

    return post.save();
  }

  async findAllByTenant(tenantId: string): Promise<Post[]> {
    return this.postModel.find({ tenantId: new Types.ObjectId(tenantId) }).exec();
  }

  async update(id: string, dto: UpdatePostDto, userId: string, tenantId: string): Promise<Post> {
    const post = await this.postModel.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      authorId: new Types.ObjectId(userId),
    });

    if (!post) {
      throw new ForbiddenException('Post not found or you do not have permission to edit it');
    }

    if (dto.title && dto.title !== post.title) {
      post.slug = slugify(dto.title, { lower: true, strict: true });
    }

    if (dto.status === 'published' && post.status !== 'published') {
      post.publishedAt = new Date();
    }

    Object.assign(post, dto);
    return post.save();
  }

  async remove(id: string, userId: string, tenantId: string): Promise<{ message: string }> {
    const result = await this.postModel.deleteOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      authorId: new Types.ObjectId(userId),
    });

    if (result.deletedCount === 0) {
      throw new ForbiddenException('Delete failed: Unauthorized or not found');
    }

    return { message: 'Post deleted successfully' };
  }

  async findPublishedByTenant(tenantId: string): Promise<Post[]> {
    return this.postModel.find({ 
      tenantId: new Types.ObjectId(tenantId), 
      status: 'published' 
    }).exec();
  }

  async findBySlugAndTenant(slug: string, tenantId: string): Promise<Post> {
    const post = await this.postModel.findOne({
      slug,
      tenantId: new Types.ObjectId(tenantId),
      status: 'published'
    }).exec();

    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async countByTenant(tenantId: string): Promise<number> {
    return this.postModel
      .countDocuments({ 
        tenantId: new Types.ObjectId(tenantId) 
      })
      .exec();
  }
}