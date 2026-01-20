import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../users/user.schema';
import { Tenant } from '../tenants/tenant.schema';

@Schema({ timestamps: true })
export class Post extends Document {
  @Prop({
    type: Types.ObjectId,
    ref: Tenant.name,
    required: true,
    index: true,
  })
  tenantId: Types.ObjectId | Tenant;

  @Prop({
    type: Types.ObjectId,
    ref: User.name,
    required: true,
  })
  authorId: Types.ObjectId | User;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, lowercase: true, trim: true })
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

PostSchema.index({ slug: 1, tenantId: 1 }, { unique: true });
