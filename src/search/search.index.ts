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
      console.log(' Starting search index creation...');

      // SKIP user text index completely - it already exists
      console.log('Skipping user text index - using existing "user_search_text_index"');

      // ONLY create post text index (this is what's missing)
      console.log('Creating post text index...');
      await this.postModel.collection.createIndex(
        { title: 'text', excerpt: 'text', tags: 'text' },
        { 
          name: 'post_search_text', 
          weights: { title: 3, tags: 2, excerpt: 1 } 
        }
      );
      console.log('Post text index created');

      // Create regular indexes (simplified)
      console.log('Creating regular indexes...');
      await this.createRegularIndexes();

      console.log(' Search index creation completed');
    } catch (error) {
      console.error('Failed to create search indexes:', error.message);
      if (error.code === 85 || error.codeName === 'IndexOptionsConflict') {
        console.log('Post text index might already exist with different options');
      }
    }
  }

  private async createRegularIndexes() {
    try {
      // Create each index separately with proper typing
      await this.postModel.collection.createIndex(
        { category: 1 } as any,
        { name: 'category_idx' }
      );
      console.log('Created category_idx');

      await this.postModel.collection.createIndex(
        { tags: 1 } as any,
        { name: 'tags_idx' }
      );
      console.log('Created tags_idx');

      await this.postModel.collection.createIndex(
        { createdAt: -1 } as any,
        { name: 'createdAt_idx' }
      );
      console.log('Created createdAt_idx');

      await this.postModel.collection.createIndex(
        { published: 1 } as any,
        { name: 'published_idx' }
      );
      console.log('Created published_idx');

      await this.postModel.collection.createIndex(
        { published: 1, category: 1 } as any,
        { name: 'published_category_idx' }
      );
      console.log('Created published_category_idx');

      await this.postModel.collection.createIndex(
        { published: 1, tags: 1 } as any,
        { name: 'published_tags_idx' }
      );
      console.log('Created published_tags_idx');
    } catch (error) {
      console.error('Failed to create regular indexes:', error.message);
    }
  }
}