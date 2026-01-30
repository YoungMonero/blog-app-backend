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
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Post not found');
    }

    const post = await this.postModel.findById(id);

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check ownership - convert both to string for comparison
    const userIdObj = new Types.ObjectId(userId);
    const tenantIdObj = new Types.ObjectId(tenantId);

    if (
      !post.authorId.equals(userIdObj) ||
      !post.tenantId.equals(tenantIdObj)
    ) {
      throw new ForbiddenException('You do not have permission to update this post');
    }

    // Handle slug update if title changed
    if (updatePostDto.title && updatePostDto.title !== post.title && !updatePostDto.slug) {
      const newSlug = updatePostDto.title
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      // Make slug unique within the same tenant
      let uniqueSlug = newSlug;
      let counter = 1;

      while (await this.postModel.findOne({
        slug: uniqueSlug,
        tenantId: post.tenantId,
        _id: { $ne: new Types.ObjectId(id) }
      })) {
        uniqueSlug = `${newSlug}-${counter}`;
        counter++;
      }

      updatePostDto.slug = uniqueSlug;
    }

    // Auto-generate excerpt if content changed and excerpt not provided
    if (updatePostDto.content && !updatePostDto.excerpt) {
      updatePostDto.excerpt = updatePostDto.content
        .substring(0, 200)
        .replace(/<[^>]*>/g, '')
        .trim();
    }

    // Auto-generate SEO description if content changed and seoDescription not provided
    if (updatePostDto.content && !updatePostDto.seoDescription) {
      updatePostDto.seoDescription = updatePostDto.content
        .substring(0, 160)
        .replace(/<[^>]*>/g, '')
        .trim();
    }

   // Handle publishedAt update when status changes to published
if (updatePostDto.status === 'published' && post.status !== 'published') {
  (updatePostDto as any).publishedAt = new Date();
} else if (updatePostDto.status !== 'published') {
  // If status is not published, remove publishedAt
  (updatePostDto as any).publishedAt = null;
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
    if (!Types.ObjectId.isValid(tenantId)) {
      return [];
    }

    return this.postModel
      .find({ tenantId: new Types.ObjectId(tenantId) })
      .sort({ createdAt: -1 })
      .populate('authorId', 'username email profilePicture')
      .exec();
  }

  async findPublishedByTenant(tenantId: string, skip = 0, limit = 10): Promise<PostDocument[]> {
    if (!Types.ObjectId.isValid(tenantId)) {
      return [];
    }

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
    if (!Types.ObjectId.isValid(tenantId)) {
      return 0;
    }

    return this.postModel
      .countDocuments({
        tenantId: new Types.ObjectId(tenantId),
        status: 'published'
      })
      .exec();
  }

  async findAllPublished(skip = 0, limit = 10): Promise<PostDocument[]> {
    return this.postModel
      .find({
        status: 'published'
      })
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('authorId', 'username email profilePicture displayName bio')
      .populate('tenantId', 'name slug')
      .exec();
  }

  async countAllPublished(): Promise<number> {
    return this.postModel
      .countDocuments({
        status: 'published'
      })
      .exec();
  }

  async findBySlugAndTenant(slug: string, tenantId: string): Promise<PostDocument | null> {
    if (!Types.ObjectId.isValid(tenantId)) {
      return null;
    }

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
    if (!Types.ObjectId.isValid(tenantId)) {
      return [];
    }

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
    if (!Types.ObjectId.isValid(tenantId)) {
      return [];
    }

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
    if (!Types.ObjectId.isValid(tenantId)) {
      return 0;
    }

    return this.postModel
      .countDocuments({
        tenantId: new Types.ObjectId(tenantId),
        status: 'published',
        tags: tag
      })
      .exec();
  }

  async search(query: string, tenantId: string, skip = 0, limit = 10): Promise<PostDocument[]> {
    if (!Types.ObjectId.isValid(tenantId)) {
      return [];
    }

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
    if (!Types.ObjectId.isValid(tenantId)) {
      return 0;
    }

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
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Post not found');
    }

    const post = await this.postModel.findById(id);

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check ownership - convert both to string for comparison
    const userIdObj = new Types.ObjectId(userId);
    const tenantIdObj = new Types.ObjectId(tenantId);

    if (
      !post.authorId.equals(userIdObj) ||
      !post.tenantId.equals(tenantIdObj)
    ) {
      throw new ForbiddenException('You do not have permission to delete this post');
    }

    await this.postModel.deleteOne({ _id: id });
  }

  async findTestPosts(): Promise<PostDocument[]> {
    const testPattern = /test/i;
    return this.postModel
      .find({
        $or: [
          { title: { $regex: testPattern } },
          { slug: { $regex: testPattern } },
          { content: { $regex: testPattern } }
        ]
      })
      .populate('authorId', 'username email')
      .populate('tenantId', 'name slug')
      .exec();
  }

  async removeTestPosts(): Promise<{ deletedCount: number; deletedPosts: any[] }> {
    const testPosts = await this.findTestPosts();
    const deletedPosts = testPosts.map(post => ({
      id: post._id.toString(),
      title: post.title,
      slug: post.slug,
      tenantId: post.tenantId
    }));

    const testPattern = /test/i;
    const result = await this.postModel.deleteMany({
      $or: [
        { title: { $regex: testPattern } },
        { slug: { $regex: testPattern } },
        { content: { $regex: testPattern } }
      ]
    });

    return {
      deletedCount: result.deletedCount || 0,
      deletedPosts
    };
  }

  async findByIdOrSlug(identifier: string, tenantId: string): Promise<PostDocument | null> {
    // Check if the identifier is a valid 24-character MongoDB ObjectId
    const isId = /^[0-9a-fA-F]{24}$/.test(identifier);

    if (isId) {
      return this.postModel.findById(identifier)
        .populate('authorId', 'username email profilePicture')
        .exec();
    }

    // If it's not an   // Security check: Only the author can see their own draftsID, search by the slug field
    return this.postModel.findOne({ 
      slug: identifier, 
      tenantId: new Types.ObjectId(tenantId) 
    })
    .populate('authorId', 'username email profilePicture')
    .exec();
  }

  // Inside src/post/post.service.ts

async findBySlugPublic(slug: string): Promise<PostDocument | null> {
  return this.postModel
    .findOne({ 
      slug: slug, 
      status: 'published' // Security: strictly only public posts
    })
    .populate('authorId', 'username displayName profilePicture bio')
    .populate('tenantId', 'name slug')
    .exec();
}
}

