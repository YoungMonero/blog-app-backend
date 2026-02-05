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

  @Prop({ default: 'reader', enum: ['reader', 'author', 'admin'] })
  role: string;

  @Prop({ required: false })
  tenantId?: string;

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

  // Password reset fields
  @Prop()
  resetCode?: string;

  @Prop()
  resetCodeExpires?: Date;

  // Optional: For email verification
  @Prop({ default: false })
  isEmailVerified?: boolean;

  @Prop()
  emailVerificationToken?: string;

  @Prop()
  emailVerificationExpires?: Date;


  @Prop({ default: 0 })
  loginCount?: number;

 
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);

// Optional: Add indexes for better performance
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ username: 1 }, { unique: true });
UserSchema.index({ tenantId: 1 });
UserSchema.index({ resetCodeExpires: 1 }, { expireAfterSeconds: 0 }); // Auto-clean expired codes