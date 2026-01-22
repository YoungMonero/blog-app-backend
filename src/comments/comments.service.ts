import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comment } from './comment.schema';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<Comment>,
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
    return { 
      message: 'Like toggled',
      postId, 
      userId, 
      liked: true 
    };
  }

  async countByUser(userId: string) {
    return this.commentModel.countDocuments({ userId }).exec();
  }
}