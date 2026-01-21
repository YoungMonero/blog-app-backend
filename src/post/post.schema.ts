import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Post extends Document {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  authorId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ required: true })
  content: string;

  @Prop()
  thumbnail?: string;

  @Prop({ default: 'draft', enum: ['draft', 'published'] })
  status: 'draft' | 'published';

  @Prop()
  excerpt?: string;

  @Prop()
  publishedAt?: Date;
}

export const PostSchema = SchemaFactory.createForClass(Post);