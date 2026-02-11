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
  ) {
    console.log('SearchIndexService constructor called');
  }

  async onApplicationBootstrap() {
    await this.createIndexes();
  }

  async createIndexes() {
    try {

      const postIndexes = await this.postModel.collection.indexes();

      const hasPostTextIndex = postIndexes.some(idx => 
        idx.name === 'post_search_text' || 
        (idx.weights && Object.keys(idx.weights).length > 0)
      );

      if (hasPostTextIndex) {
      } else {

        const result = await this.postModel.collection.createIndex(
          { title: 'text', excerpt: 'text', tags: 'text' },
          { 
            name: 'post_search_text', 
            weights: { title: 3, tags: 2, excerpt: 1 } 
          }
        );
      }
      
    } catch (error) {
      console.error('Failed to create search indexes:');
      console.error('   Message:', error.message);
      console.error('   Code:', error.code);
      console.error('   CodeName:', error.codeName);
      console.error('   Full error:', error);
      
      if (error.code === 85 || error.codeName === 'IndexOptionsConflict') {
        console.log(' Index already exists with different options');
      }
    }
  }
}