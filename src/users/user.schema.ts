import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true, unique: true }) 
  username: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ default: 'reader' })
  role: 'reader' | 'author';

  @Prop({ required: false })
  tenantId?: string;

  @Prop()
createdAt?: Date;

@Prop()
updatedAt?: Date;

  @Prop({ default: '' })
  bio?: string;

  @Prop()
  profilePicture?: string;

  @Prop()
  profilePicturePublicId?: string;

  @Prop()
  displayName?: string;

  @Prop()
  lastLoginAt?: Date;
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);
