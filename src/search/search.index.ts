import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/user.schema';
import { Post, PostDocument } from '../post/post.schema';

@Injectable()
export class SearchIndexService implements OnApplicationBootstrap {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Post.name) private readonly postModel: Model<PostDocument>,
  ) {}

  async onApplicationBootstrap() {
    await this.createIndexes();
  }

  async createIndexes() {
    try {
      // Text indexes for search
      await this.userModel.collection.createIndex(
        { username: 'text', displayName: 'text', bio: 'text' },
        { name: 'user_search_text', weights: { username: 3, displayName: 2, bio: 1 } }
      );

      await this.postModel.collection.createIndex(
        { title: 'text', excerpt: 'text', tags: 'text' },
        { name: 'post_search_text', weights: { title: 3, tags: 2, excerpt: 1 } }
      );

      // Regular indexes for fast filtering
      await this.postModel.collection.createIndex({ category: 1 });
      await this.postModel.collection.createIndex({ tags: 1 });
      await this.postModel.collection.createIndex({ createdAt: -1 });
      await this.postModel.collection.createIndex({ published: 1 });
      
      // Compound indexes for common queries
      await this.postModel.collection.createIndex({ 
        published: 1, 
        category: 1 
      });
      await this.postModel.collection.createIndex({ 
        published: 1, 
        tags: 1 
      });

      console.log('✅ Search indexes created successfully');
    } catch (error) {
      console.error('❌ Failed to create search indexes:', error);
    }
  }
}