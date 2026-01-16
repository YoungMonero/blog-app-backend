// // 

// import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// import { Document } from 'mongoose';

// @Schema({ timestamps: true })
// export class Tenant extends Document {
//   @Prop({ required: true })
//   name: string;


// }

// export const TenantSchema = SchemaFactory.createForClass(Tenant);


// src/tenants/tenant.schema.ts

// import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// import { Document, Types } from 'mongoose';

// @Schema({ timestamps: true })
// export class Tenant extends Document {
//   @Prop({ required: true })
//   name: string; // Blog name (display)

//   @Prop({ required: true, unique: true })
//   slug: string; // URL slug (my-blog)

//   @Prop({ type: Types.ObjectId, ref: 'User', required: true })
//   owner: Types.ObjectId; // User who owns this blog

//   @Prop({ default: '' })
//   description?: string; // SEO description

//   @Prop({ default: '' })
//   logo?: string; // Optional blog logo
// }

// export const TenantSchema = SchemaFactory.createForClass(Tenant);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Tenant extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ required: true })
  owner: string;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);
