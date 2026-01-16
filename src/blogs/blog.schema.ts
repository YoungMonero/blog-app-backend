// import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// import { Document } from 'mongoose';

// @Schema({ timestamps: true })
// export class Blog extends Document {
//   @Prop({ required: true })
//   title: string;

//   @Prop({ required: true, unique: true })
//   slug: string;

//   @Prop({ required: true })
//   description: string;

//   @Prop({ required: true })
//   tenantId: string; // links blog to tenant
// }

// export const BlogSchema = SchemaFactory.createForClass(Blog);


import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Blog extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  tenantId: string;
}

export const BlogSchema = SchemaFactory.createForClass(Blog);
