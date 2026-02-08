import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Blog extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true, unique: true })
  slug: string;

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

  // ✅ COVER IMAGE (banner)
  @Prop()
  coverImage: string;

  // ✅ PROFILE IMAGE (avatar)
  @Prop()
  profileImage: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Date })
  publishedAt: Date;

  @Prop()
  metaTitle: string;

  @Prop()
  metaDescription: string;
}

export const BlogSchema = SchemaFactory.createForClass(Blog);
