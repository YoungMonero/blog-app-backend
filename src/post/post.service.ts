import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Post, PostDocument } from './post.schema';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
  ) {}

  async create(
    createPostDto: CreatePostDto, 
    userId: string, 
    tenantId: string
  ): Promise<PostDocument> {

    let slug = createPostDto.slug;
    if (!slug) {
      slug = createPostDto.title
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
    }

    // Ensure slug is unique for this tenant
    let uniqueSlug = slug;
    let counter = 1;
    
    while (await this.postModel.findOne({ 
      slug: uniqueSlug, 
      tenantId: new Types.ObjectId(tenantId) 
    })) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    // Auto-generate excerpt if not provided
    let excerpt = createPostDto.excerpt;
    if (!excerpt) {
      excerpt = createPostDto.content
        .substring(0, 200)
        .replace(/<[^>]*>/g, '')
        .trim();
    }


    let seoDescription = createPostDto.seoDescription;
    if (!seoDescription) {
      seoDescription = createPostDto.content
        .substring(0, 160)
        .replace(/<[^>]*>/g, '')
        .trim();
    }

    const post = new this.postModel({
      ...createPostDto,
      slug: uniqueSlug,
      excerpt,
      seoDescription,
      tags: createPostDto.tags || [],
      authorId: new Types.ObjectId(userId),
      tenantId: new Types.ObjectId(tenantId),
      publishedAt: createPostDto.status === 'published' ? new Date() : undefined,
    });

    return post.save();
  }

  async update(
    id: string, 
    updatePostDto: UpdatePostDto, 
    userId: string, 
    tenantId: string
  ): Promise<PostDocument> {
    const post = await this.postModel.findById(id);
    
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check ownership
    if (
      post.authorId.toString() !== userId ||
      post.tenantId.toString() !== tenantId
    ) {
      throw new ForbiddenException('You do not have permission to update this post');
    }

    // Handle slug update if title changed
    if (updatePostDto.title && updatePostDto.title !== post.title && !updatePostDto.slug) {
      const newSlug = updatePostDto.title
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      
      // Make slug unique
      let uniqueSlug = newSlug;
      let counter = 1;
      
      while (await this.postModel.findOne({ 
        slug: uniqueSlug, 
        tenantId: post.tenantId,
        _id: { $ne: id }
      })) {
        uniqueSlug = `${newSlug}-${counter}`;
        counter++;
      }
      
      updatePostDto.slug = uniqueSlug;
    }

    // Auto-generate excerpt if content is updated
    if (updatePostDto.content && !updatePostDto.excerpt) {
      updatePostDto.excerpt = updatePostDto.content
        .substring(0, 200)
        .replace(/<[^>]*>/g, '')
        .trim();
    }

    // Auto-generate SEO description if content is updated
    if (updatePostDto.content && !updatePostDto.seoDescription) {
      updatePostDto.seoDescription = updatePostDto.content
        .substring(0, 160)
        .replace(/<[^>]*>/g, '')
        .trim();
    }

    const updatedPost = await this.postModel.findByIdAndUpdate(
      id,
      updatePostDto,
      { new: true }
    );

    if (!updatedPost) {
      throw new NotFoundException('Post not found after update');
    }

    return updatedPost;
  }

  async findAllByTenant(tenantId: string): Promise<PostDocument[]> {
    return this.postModel
      .find({ tenantId: new Types.ObjectId(tenantId) })
      .sort({ createdAt: -1 })
      .populate('authorId', 'username email profilePicture')
      .exec();
  }

  async findPublishedByTenant(tenantId: string, skip = 0, limit = 10): Promise<PostDocument[]> {
    return this.postModel
      .find({ 
        tenantId: new Types.ObjectId(tenantId), 
        status: 'published' 
      })
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('authorId', 'username email profilePicture displayName bio')
      .populate('tenantId', 'name slug')
      .exec();
  }

  async countPublishedByTenant(tenantId: string): Promise<number> {
    return this.postModel
      .countDocuments({ 
        tenantId: new Types.ObjectId(tenantId), 
        status: 'published' 
      })
      .exec();
  }

  async findBySlugAndTenant(slug: string, tenantId: string): Promise<PostDocument | null> {
    return this.postModel
      .findOne({ 
        slug, 
        tenantId: new Types.ObjectId(tenantId),
        status: 'published'
      })
      .populate('authorId', 'username email profilePicture displayName bio')
      .populate('tenantId', 'name slug')
      .exec();
  }

  async getTagsByTenant(tenantId: string): Promise<string[]> {
    const result = await this.postModel
      .aggregate([
        {
          $match: {
            tenantId: new Types.ObjectId(tenantId),
            status: 'published',
            tags: { $exists: true, $not: { $size: 0 } }
          }
        },
        {
          $unwind: '$tags'
        },
        {
          $group: {
            _id: '$tags',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ])
      .exec();

    return result.map(item => item._id);
  }

  async findByTag(tag: string, tenantId: string, skip = 0, limit = 10): Promise<PostDocument[]> {
    return this.postModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        status: 'published',
        tags: tag
      })
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('authorId', 'username email profilePicture displayName bio')
      .populate('tenantId', 'name slug')
      .exec();
  }

  async countByTag(tag: string, tenantId: string): Promise<number> {
    return this.postModel
      .countDocuments({
        tenantId: new Types.ObjectId(tenantId),
        status: 'published',
        tags: tag
      })
      .exec();
  }

  async search(query: string, tenantId: string, skip = 0, limit = 10): Promise<PostDocument[]> {
    const searchRegex = new RegExp(query, 'i');
    return this.postModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        status: 'published',
        $or: [
          { title: searchRegex },
          { content: searchRegex },
          { excerpt: searchRegex },
          { seoDescription: searchRegex },
          { tags: { $in: [searchRegex] } }
        ]
      })
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('authorId', 'username email profilePicture displayName bio')
      .populate('tenantId', 'name slug')
      .exec();
  }

  async searchCount(query: string, tenantId: string): Promise<number> {
    const searchRegex = new RegExp(query, 'i');
    return this.postModel
      .countDocuments({
        tenantId: new Types.ObjectId(tenantId),
        status: 'published',
        $or: [
          { title: searchRegex },
          { content: searchRegex },
          { excerpt: searchRegex },
          { seoDescription: searchRegex },
          { tags: { $in: [searchRegex] } }
        ]
      })
      .exec();
  }

  async findOne(id: string): Promise<PostDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.postModel
      .findById(id)
      .populate('authorId', 'username email profilePicture')
      .exec();
  }

  async remove(id: string, userId: string, tenantId: string): Promise<void> {
    const post = await this.postModel.findById(id);
    
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check ownership
    if (
      post.authorId.toString() !== userId ||
      post.tenantId.toString() !== tenantId
    ) {
      throw new ForbiddenException('You do not have permission to delete this post');
    }

    await this.postModel.deleteOne({ _id: id });
  }
}