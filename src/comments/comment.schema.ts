import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Comment extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Post' })
  postId: Types.ObjectId;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  authorName: string;

  @Prop({ default: 'reader' })
  authorRole: 'reader' | 'author';

  @Prop({ required: true })
  content: string;

  @Prop({ default: 0 })
  likes: number;

  @Prop({ default: [] })
  likedBy: string[];
}

export const CommentSchema = SchemaFactory.createForClass(Comment);