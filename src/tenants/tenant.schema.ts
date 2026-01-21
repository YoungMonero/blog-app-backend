import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Tenant extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({required: true})
  userId: string;

  @Prop({ type: String, required: true })
  owner: string;
}
export const TenantSchema = SchemaFactory.createForClass(Tenant);
