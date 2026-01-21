import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Post } from './post.schema';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<Post>,
  ) {}

  async create(createPostDto: CreatePostDto, userId: string): Promise<Post> {
    // Generate slug from title if not provided
    let slug = createPostDto.slug;
    if (!slug) {
      slug = this.generateSlug(createPostDto.title);
    }

    // Check if slug already exists for this user
    const existingSlug = await this.postModel.findOne({ 
      slug, 
      authorId: new Types.ObjectId(userId) 
    });
    
    if (existingSlug) {
      throw new BadRequestException('You already have a post with this slug');
    }

    const postData = {
      ...createPostDto,
      slug,
      authorId: new Types.ObjectId(userId),
      ...(createPostDto.status === 'published' && { publishedAt: new Date() }),
    };

    const createdPost = new this.postModel(postData);
    return createdPost.save();
  }


async findBySlugAndUser(slug: string, userId: string): Promise<Post> {
  const post = await this.postModel
    .findOne({ 
      slug, 
      authorId: new Types.ObjectId(userId)
    })
    .populate('authorId', 'username email name') // Populate author info
    .exec();
  
  if (!post) {
    throw new NotFoundException('Post not found');
  }
  return post;
}

  async findAllByUser(userId: string): Promise<Post[]> {
    return this.postModel
      .find({ authorId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findPublishedByUser(userId: string): Promise<Post[]> {
    return this.postModel
      .find({ 
        authorId: new Types.ObjectId(userId), 
        status: 'published' 
      })
      .sort({ publishedAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<Post> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid post ID');
    }

    const post = await this.postModel.findById(id).exec();
    
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    return post;
  }

  async findBySlug(slug: string, userId: string): Promise<Post> {
    const post = await this.postModel
      .findOne({ 
        slug, 
        authorId: new Types.ObjectId(userId)
      })
      .exec();
    
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    return post;
  }

  async update(id: string, updatePostDto: UpdatePostDto, userId: string): Promise<Post> {
    const post = await this.findOne(id);
    
    // Check ownership
    if (post.authorId.toString() !== userId) {
      throw new ForbiddenException('You can only update your own posts');
    }

    // If slug is being updated, check uniqueness
    if (updatePostDto.slug && updatePostDto.slug !== post.slug) {
      const existingSlug = await this.postModel.findOne({
        slug: updatePostDto.slug,
        authorId: new Types.ObjectId(userId),
        _id: { $ne: id }
      });
      
      if (existingSlug) {
        throw new BadRequestException('You already have a post with this slug');
      }
    }

    // Handle publish/unpublish
    if (updatePostDto.status === 'published' && post.status === 'draft') {
      updatePostDto['publishedAt'] = new Date();
    } else if (updatePostDto.status === 'draft' && post.status === 'published') {
      updatePostDto['publishedAt'] = undefined;
    }

    Object.assign(post, updatePostDto);
    return post.save();
  }

  async remove(id: string, userId: string): Promise<Post> {
    const post = await this.findOne(id);
    
    if (post.authorId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }
  
    const deletedPost = await this.postModel.findByIdAndDelete(id).exec();
    
    if (!deletedPost) {
      throw new NotFoundException('Post not found or already deleted');
    }
    
    return deletedPost;
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .trim();
  }
}