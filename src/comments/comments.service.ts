import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Comment } from './comment.schema';
import { Post } from '../post/post.schema';
import { NotificationService } from '../notifications/notification.service';
import { EventEmitter2 } from '@nestjs/event-emitter'; 


@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<Comment>,
    @InjectModel(Post.name) private readonly postModel: Model<Post>,
    private notificationService: NotificationService,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(commentData: any) {
    const postObjectId = new Types.ObjectId(commentData.postId);
    const userObjectId = new Types.ObjectId(commentData.userId);
    const parentObjectId = commentData.parentCommentId
      ? new Types.ObjectId(commentData.parentCommentId)
      : null;
  
    const comment = new this.commentModel({
      ...commentData,
      postId: postObjectId,
      userId: userObjectId,
      parentCommentId: parentObjectId,
    });
  
    const savedComment = await comment.save();
  
    await this.postModel.findByIdAndUpdate(postObjectId, {
      $inc: { commentsCount: 1 },
      $push: { commentIds: savedComment._id },
    });
  
    if (parentObjectId) {
      await this.commentModel.findByIdAndUpdate(parentObjectId, {
        $inc: { replyCount: 1 },
      });
    }
  

    const post = await this.postModel.findById(postObjectId).lean();
  

    if (post && post.authorId.toString() !== commentData.userId) {
      await this.notificationService.createNotification({
        recipientId: post.authorId.toString(),
        actorId: commentData.userId,
        type: 'comment',
        postId: commentData.postId,
        commentId: savedComment._id.toString(),
        content: `commented on your post: "${commentData.content?.substring(0, 40)}..."`,
      });
    }
  
    if (parentObjectId) {
      const parentComment = await this.commentModel
        .findById(parentObjectId)
        .lean();
  
      if (
        parentComment &&
        parentComment.userId.toString() !== commentData.userId
      ) {
        await this.notificationService.createNotification({
          recipientId: parentComment.userId.toString(),
          actorId: commentData.userId,
          type: 'reply',
          postId: commentData.postId,
          commentId: savedComment._id.toString(),
          parentCommentId: commentData.parentCommentId,
          content: `replied to your comment`,
        });
      }
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
    const wasLiked = userIndex !== -1;

    if (userIndex === -1) {
      comment.likedBy.push(userObjectId);
    } else {
      comment.likedBy.splice(userIndex, 1);
    }

    comment.likes = comment.likedBy.length;
    await comment.save();

    if (!wasLiked && comment.userId.toString() !== userId) {
      const post = await this.postModel.findById(comment.postId);
      await this.notificationService.createNotification({
        recipientId: comment.userId.toString(),
        actorId: userId,
        type: 'like',
        postId: comment.postId?.toString(),
        commentId: commentId,
        content: `liked your comment`,
      });
    }

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
    const wasLiked = userIndex !== -1;
  
    if (!wasLiked) {
      post.likedBy.push(userId);
    } else {
      post.likedBy.splice(userIndex, 1);
    }
  
    post.likes = post.likedBy.length;
    await post.save();
  

    if (!wasLiked && post.authorId.toString() !== userId) {
      await this.notificationService.createNotification({
        recipientId: post.authorId.toString(),
        actorId: userId,
        type: 'like',
        postId: postId,
        content: `liked your post "${post.title?.substring(0, 30)}..."`,
      });
    }
  
    // Delete notification on unlike
    if (wasLiked && post.authorId.toString() !== userId) {
      await this.notificationService.deleteNotification({
        recipientId: post.authorId.toString(),
        actorId: userId,
        type: 'like',
        postId: postId,
      });
    }
  
    return {
      liked: !wasLiked,
      likes: post.likes,
    };
  }
  
}