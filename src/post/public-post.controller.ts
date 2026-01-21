// post/public-post.controller.ts
import { Controller, Get, Param, NotFoundException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PostService } from './post.service';
import { User } from '../users/user.schema';
import { Post } from './post.schema';

@Controller('public')
export class PublicPostController {
  constructor(
    private readonly postService: PostService,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  @Get(':userIdentifier') // Can be email or ID
  async getUserPublishedPosts(@Param('userIdentifier') userIdentifier: string) {
    let user: User | null;
    
    // Try to find by email (since that's what we have)
    user = await this.userModel.findOne({ email: userIdentifier }).exec();
    
    // If not found by email, try as ObjectId
    if (!user && Types.ObjectId.isValid(userIdentifier)) {
      user = await this.userModel.findById(userIdentifier).exec();
    }
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    return this.postService.findPublishedByUser(user._id.toString());
  }

  @Get(':userIdentifier/:postSlug')
  async getPostBySlug(
    @Param('userIdentifier') userIdentifier: string,
    @Param('postSlug') postSlug: string,
  ) {
    let user: User | null;
    
    user = await this.userModel.findOne({ email: userIdentifier }).exec();
    
    if (!user && Types.ObjectId.isValid(userIdentifier)) {
      user = await this.userModel.findById(userIdentifier).exec();
    }
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    const post = await this.postService.findBySlugAndUser(
      postSlug, 
      user._id.toString()
    );
    
    if (!post || post.status !== 'published') {
      throw new NotFoundException('Post not found');
    }
    
    return post;
  }
}