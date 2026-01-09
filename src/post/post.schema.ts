import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Post extends Document {
  @Prop({ required: true })
  tenantId: string;

  @Prop({ required: true })
  authorId: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ required: true })
  content: string;

  @Prop()
  thumbnail?: string;

  @Prop({ default: 'draft' })
  status: 'draft' | 'published';

  @Prop()
  publishedAt?: Date;
}

export const PostSchema = SchemaFactory.createForClass(Post);
