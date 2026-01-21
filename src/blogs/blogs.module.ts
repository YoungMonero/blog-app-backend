import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BlogsController } from './blogs.controller';
import { BlogsService } from './blogs.service';
import { Blog, BlogSchema } from './blog.schema';
import { AuthModule } from '../auth/auth.module'; // 👈 import AuthModule

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Blog.name, schema: BlogSchema }]),
    AuthModule, // 👈 brings JwtService + JwtAuthGuard into BlogsModule
  ],
  controllers: [BlogsController],
  providers: [BlogsService],
})
export class BlogsModule {}
