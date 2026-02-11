import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Comment } from './comment.schema';
import { Post } from '../post/post.schema';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<Comment>,
    @InjectModel(Post.name) private readonly postModel: Model<Post>,
  ) {}

  async create(commentData: any) {
    const comment = new this.commentModel({
      ...commentData,
      postId: new Types.ObjectId(commentData.postId),
      userId: new Types.ObjectId(commentData.userId),
      parentCommentId: commentData.parentCommentId 
        ? new Types.ObjectId(commentData.parentCommentId)
        : null,
    });
    
    const savedComment = await comment.save();

    // Always increment post's comment count
    await this.postModel.findByIdAndUpdate(
      commentData.postId,
      { 
        $inc: { commentsCount: 1 },
        $push: { commentIds: savedComment._id } // ← ADD THIS
      }
    );
    
    // If it's a reply, increment parent comment's reply count
    if (commentData.parentCommentId) {
      await this.commentModel.findByIdAndUpdate(
        commentData.parentCommentId,
        { $inc: { replyCount: 1 } }
      );
    }
    
    return savedComment;
  }

  async findByPost(postId: string) {
    return this.commentModel
      .find({ postId: new Types.ObjectId(postId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async toggleCommentLike(commentId: string, userId: string) {
    const comment = await this.commentModel.findById(commentId);
    
    if (!comment) {
      throw new Error('Comment not found');
    }

    const userObjectId = new Types.ObjectId(userId);
    const userIndex = comment.likedBy.findIndex(id => id.equals(userObjectId));

    if (userIndex === -1) {
      comment.likedBy.push(userObjectId);
    } else {
      comment.likedBy.splice(userIndex, 1);
    }

    comment.likes = comment.likedBy.length;
    await comment.save();

    return {
      liked: userIndex === -1,
      likes: comment.likes,
    };
  }

  async toggleLike(postId: string, userId: string) {
    const post = await this.postModel.findById(postId);
    
    if (!post) {
      throw new Error('Post not found');
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