import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Blog extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true, unique: true })
  slug: string;
  
  @Prop({ default: false })
  isPrivate: boolean;
  
  @Prop()
  description: string;

  @Prop({ required: true })
  tenantId: string;

  @Prop({ required: true })
  authorName: string;

  @Prop()
  content: string;

  @Prop()
  excerpt: string;

  @Prop()
  coverImage: string;

  @Prop()
  profileImage: string;

  @Prop({ type: [String], default: [] })
  categories: string[];

  @Prop({ type: Date })
  publishedAt: Date;

  @Prop()
  metaTitle: string;

  @Prop()
  metaDescription: string;
}

export const BlogSchema = SchemaFactory.createForClass(Blog);

BlogSchema.index({ categories: 1 });
BlogSchema.index({ tenantId: 1, categories: 1 });
