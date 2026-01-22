import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PostDocument = Post & Document;

@Schema({ timestamps: true }) 
export class Post {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorId: Types.ObjectId; 

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  slug: string; 

  @Prop({ required: true })
  content: string;

  @Prop()
  thumbnail?: string;

  @Prop({ default: 'draft', enum: ['draft', 'published'] })
  status: 'draft' | 'published';

  @Prop()
  publishedAt?: Date;
}

export const PostSchema = SchemaFactory.createForClass(Post);

PostSchema.index({ slug: 1, tenantId: 1 }, { unique: true });