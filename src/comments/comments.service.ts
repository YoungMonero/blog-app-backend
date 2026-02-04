import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comment } from './comment.schema';


@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<Comment>,
    @InjectModel('Post') private readonly postModel: Model<any>,
  ) {}

  async create(commentData: any) {
    const comment = new this.commentModel(commentData);
    return comment.save();
  }

  async findByPost(postId: string) {
    return this.commentModel
      .find({ postId })
      .sort({ createdAt: -1 })
      .exec();
  }

async toggleLike(postId: string, userId: string) {
  const post = await this.postModel.findById(postId);
  
  if (!post) {
    throw new Error('Post not found');
  }

  if (!post.likedBy) {
    post.likedBy = []; 
  }
  if (typeof post.likes !== 'number') {
    post.likes = 0;
  }

  const userIndex = post.likedBy.indexOf(userId);

  if (userIndex === -1) {
    post.likedBy.push(userId);
  } else {
    post.likedBy.splice(userIndex, 1);
  }

  post.likes = post.likedBy.length;

  await post.save();

  return {
    liked: userIndex === -1,
    likes: post.likes,
  };
}
}