import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
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

  private normalizeCategories(categories: string[]): string[] {
    if (!Array.isArray(categories)) return [];
    
    return categories
      .map(cat => String(cat).toLowerCase().trim())
      .filter(cat => cat.length > 0)
      .filter((cat, index, self) => self.indexOf(cat) === index);
  }

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
      commentsCount: 0,
      views: 0,
      commentIds: [],
      excerpt,
      seoDescription,
      categories: this.normalizeCategories(createPostDto.categories || []),
      authorId: new Types.ObjectId(userId),
      tenantId: new Types.ObjectId(tenantId),
      publishedAt: createPostDto.status === 'published' ? new Date() : undefined,
    });

    return post.save();
  }


async incrementViews(postId: string, userId?: string): Promise<any> {
  try {
    if (!Types.ObjectId.isValid(postId)) {
      throw new BadRequestException('Invalid post ID format');
    }

     const post = await this.postModel.findById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    
    if (!userId) {
      post.views += 1;
      await post.save();
      return { 
        success: true, 
        views: post.views, 
        isNewView: true,
        message: 'View counted (anonymous user)' 
      };
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID format');
    }
    const userObjectId = new Types.ObjectId(userId);
    const authorObjectId = post.authorId;
    
    if (userObjectId.equals(authorObjectId)) {
      return { 
        success: true, 
        views: post.views, 
        isNewView: false,
        message: 'Author viewing own post - view not counted' 
      };
    }
    const hasViewed = post.viewedBy.some(viewerId => 
      viewerId && viewerId.equals(userObjectId)
    );
    if (hasViewed) {
      return { 
        success: true, 
        views: post.views, 
        isNewView: false,
        message: 'User already viewed this post' 
      };
    }
    post.viewedBy.push(userObjectId);
    post.views += 1;
    await post.save();
    
    return { 
      success: true, 
      views: post.views, 
      isNewView: true,
      message: 'View counted successfully' 
    };
  } catch (error) {
    console.error(`Failed to increment views: ${error.message}`, error.stack);
    if (error instanceof NotFoundException || 
        error instanceof BadRequestException) {
      throw error;
    }
    throw new BadRequestException(`Failed to increment views: ${error.message}`);
  }
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

  const userIdObj = new Types.ObjectId(userId);
  const tenantIdObj = new Types.ObjectId(tenantId);

  if (!post.authorId.equals(userIdObj)) {
    throw new ForbiddenException('You do not have permission to update this post');
  }
  
  if (!post.tenantId.equals(tenantIdObj)) {
    throw new ForbiddenException('You do not have permission to update this post');
  }

  if (updatePostDto.title && updatePostDto.title !== post.title && !updatePostDto.slug) {
    const newSlug = updatePostDto.title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

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

  if (updatePostDto.content && !updatePostDto.excerpt) {
    updatePostDto.excerpt = updatePostDto.content
      .substring(0, 200)
      .replace(/<[^>]*>/g, '')
      .trim();
  }

  if (updatePostDto.content && !updatePostDto.seoDescription) {
    updatePostDto.seoDescription = updatePostDto.content
      .substring(0, 160)
      .replace(/<[^>]*>/g, '')
      .trim();
  }

  if (updatePostDto.categories !== undefined) {
    updatePostDto.categories = this.normalizeCategories(updatePostDto.categories);
  }

  const updateData: any = { ...updatePostDto };

  if (updatePostDto.status === 'published' && post.status !== 'published') {
    updateData.publishedAt = new Date();
  } else if (updatePostDto.status === 'draft') {
    updateData.publishedAt = null;
  }

  const updatedPost = await this.postModel.findByIdAndUpdate(
    id,
    updateData,
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

    const validatedSkip = Math.max(0, skip);
    const validatedLimit = Math.min(Math.max(1, limit), 100);

    return this.postModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        status: 'published'
      })
      .sort({ publishedAt: -1 })
      .skip(validatedSkip)
      .limit(validatedLimit)
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

    const validatedSkip = Math.max(0, skip);
    const validatedLimit = Math.min(Math.max(1, limit), 100);

    return this.postModel
      .find({
        status: 'published'
      })
      .sort({ publishedAt: -1 })
      .skip(validatedSkip)
      .limit(validatedLimit)
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

  async getCategories(tenantId: string): Promise<string[]> {
    if (!Types.ObjectId.isValid(tenantId)) {
      return [];
    }

    return this.postModel.distinct('categories', {
      tenantId: new Types.ObjectId(tenantId),
      status: 'published',
      categories: { $exists: true, $ne: [] }
    });
  }

  async findByCategory(
    category: string,
    tenantId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ posts: PostDocument[]; total: number; totalPages: number }> {
    if (!Types.ObjectId.isValid(tenantId)) {
      return { posts: [], total: 0, totalPages: 0 };
    }

    const normalizedCategory = category.toLowerCase().trim();
    
    const query = {
      tenantId: new Types.ObjectId(tenantId),
      status: 'published',
      categories: normalizedCategory
    };

    const total = await this.postModel.countDocuments(query);
    const posts = await this.postModel
      .find(query)
      .sort({ publishedAt: -1 })
      .skip((Math.max(1, page) - 1) * Math.min(Math.max(1, limit), 50))
      .limit(Math.min(Math.max(1, limit), 50))
      .populate('authorId', 'username email profilePicture displayName bio')
      .populate('tenantId', 'name slug')
      .exec();

    return {
      posts,
      total,
      totalPages: Math.ceil(total / Math.min(Math.max(1, limit), 50))
    };
  }

  async getCategoriesWithCounts(tenantId: string): Promise<Array<{ name: string; count: number }>> {
    if (!Types.ObjectId.isValid(tenantId)) {
      return [];
    }

    const result = await this.postModel.aggregate([
      { 
        $match: { 
          tenantId: new Types.ObjectId(tenantId),
          status: 'published',
          categories: { $exists: true, $ne: [] }
        }
      },
      { $unwind: '$categories' },
      { 
        $group: { 
          _id: '$categories', 
          count: { $sum: 1 } 
        }
      },
      { $sort: { count: -1 } }
    ]);

    return result.map(item => ({
      name: item._id,
      count: item.count
    }));
  }

  async search(query: string, tenantId: string, skip = 0, limit = 10): Promise<PostDocument[]> {
    if (!Types.ObjectId.isValid(tenantId)) {
      return [];
    }

    const searchRegex = new RegExp(query, 'i');
    

    const validatedSkip = Math.max(0, skip);
    const validatedLimit = Math.min(Math.max(1, limit), 100);

    return this.postModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        status: 'published',
        $or: [
          { title: searchRegex },
          { content: searchRegex },
          { excerpt: searchRegex },
          { seoDescription: searchRegex },
          { categories: searchRegex }
        ]
      })
      .sort({ publishedAt: -1 })
      .skip(validatedSkip)
      .limit(validatedLimit)
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
          { categories: searchRegex }
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
  

    const userIdObj = new Types.ObjectId(userId);
    const tenantIdObj = new Types.ObjectId(tenantId);
  
    if (!post.authorId.equals(userIdObj)) {
      throw new ForbiddenException('You do not have permission to delete this post');
    }
    
    if (!post.tenantId.equals(tenantIdObj)) {
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

  async findByIdOrSlug(identifier: string): Promise<PostDocument | null> {
    const isId = /^[0-9a-fA-F]{24}$/.test(identifier);
  
    if (isId) {

      return this.postModel.findById(new Types.ObjectId(identifier))
        .populate('authorId', 'username email profilePicture')
        .exec();
    }
  

    return this.postModel.findOne({ slug: identifier })
      .populate('authorId', 'username email profilePicture')
      .exec();
  }

  async findBySlugPublic(slug: string): Promise<PostDocument | null> {
    return this.postModel
      .findOne({ 
        slug: slug, 
        status: 'published'
      })
      .populate('authorId', 'username displayName profilePicture bio')
      .populate('tenantId', 'name slug')
      .exec();
  }

  async getPopularPosts(limit: number = 5) {
    const validatedLimit = Math.min(Math.max(1, limit), 20);
    
    return this.postModel
      .find({ status: 'published' }) 
      .sort({ likes: -1 })           
      .limit(validatedLimit)
      .populate('authorId', 'username displayName profilePicture')
      .populate('tenantId', 'name slug')
      .exec();
  }

  async getEditorsPicks(limit: number = 3) {
    const validatedLimit = Math.min(Math.max(1, limit), 10);
    
    return this.postModel
      .find({ 
        status: 'published', 
        isFeatured: true 
      })
      .populate('authorId', 'username displayName profilePicture')
      .populate('tenantId', 'name slug')
      .sort({ createdAt: -1 })
      .limit(validatedLimit)
      .exec();
  }
}