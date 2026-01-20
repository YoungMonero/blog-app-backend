import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Post } from './post.schema';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostService {
  constructor(
    @InjectModel(Post.name) private readonly postModel: Model<Post>,
  ) {}

  async create(
    createPostDto: CreatePostDto,
    userId: string,
    tenantId: string,
  ): Promise<Post> {
    let slug = createPostDto.slug;
    if (!slug) {
      slug = this.generateSlug(createPostDto.title);
    }

    const existingSlug = await this.postModel.findOne({
      slug,
      tenantId: new Types.ObjectId(tenantId),
    });

    if (existingSlug) {
      throw new BadRequestException('Slug already exists for this tenant');
    }

    const postData = {
      ...createPostDto,
      slug,
      authorId: new Types.ObjectId(userId),
      tenantId: new Types.ObjectId(tenantId),
      ...(createPostDto.status === 'published' && {
        publishedAt: new Date(),
      }),
    };

    const createdPost = new this.postModel(postData);
    return createdPost.save();
  }

  async findAllByTenant(tenantId: string): Promise<Post[]> {
    return this.postModel
      .find({ tenantId: new Types.ObjectId(tenantId) })
      .populate('authorId', 'name email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByStatus(
    tenantId: string,
    status: 'draft' | 'published',
  ): Promise<Post[]> {
    return this.postModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        status,
      })
      .sort({
        [status === 'published' ? 'publishedAt' : 'createdAt']: -1,
      })
      .exec();
  }

  async findPublishedByTenant(tenantId: string): Promise<Post[]> {
    return this.findByStatus(tenantId, 'published');
  }

  async findOne(id: string): Promise<Post> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid post ID');
    }

    const post = await this.postModel
      .findById(id)
      .populate('authorId', 'name email')
      .exec();

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  async findBySlug(slug: string, tenantId: string): Promise<Post> {
    const post = await this.postModel
      .findOne({
        slug,
        tenantId: new Types.ObjectId(tenantId),
        status: 'published',
      })
      .populate('authorId', 'name email')
      .populate('tenantId', 'name slug')
      .exec();

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  async update(
    id: string,
    updatePostDto: UpdatePostDto,
    userId: string,
  ): Promise<Post> {
    const post = await this.findOne(id);

    if (post.authorId.toString() !== userId) {
      throw new ForbiddenException('You can only update your own posts');
    }

    if (updatePostDto.slug && updatePostDto.slug !== post.slug) {
      const existingSlug = await this.postModel.findOne({
        slug: updatePostDto.slug,
        tenantId: post.tenantId,
        _id: { $ne: id },
      });

      if (existingSlug) {
        throw new BadRequestException(
          'Slug already exists for this tenant',
        );
      }
    }

    if (
      updatePostDto.status === 'published' &&
      post.status === 'draft'
    ) {
      updatePostDto['publishedAt'] = new Date();
    }

    if (
      updatePostDto.status === 'draft' &&
      post.status === 'published'
    ) {
      updatePostDto['publishedAt'] = null;
    }

    Object.assign(post, updatePostDto);
    return post.save();
  }

  async remove(id: string, userId: string): Promise<Post> {
    const post = await this.findOne(id);
  
    if (post.authorId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }
  
    const deletedPost = await this.postModel
      .findByIdAndDelete(id)
      .exec();
  
    if (!deletedPost) {
      throw new NotFoundException('Post not found');
    }
  
    return deletedPost;
  }
  
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
}
