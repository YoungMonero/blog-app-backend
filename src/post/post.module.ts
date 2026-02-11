import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PostController } from './post.controller';
import { PublicPostController } from './public-post.controller';
import { PostService } from './post.service';
import { Post, PostSchema } from './post.schema';
import { UsersModule } from '../users/users.module'; 
import { AuthModule } from '../auth/auth.module'; 
import { TenantModule } from '../tenants/tenant.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module' 
import { BlogsModule } from '../blogs/blogs.module';
import { PostStatsService } from '../post/post-stats.service'
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Post.name, schema: PostSchema }]),
    UsersModule,
    AuthModule,
    TenantModule,
    CloudinaryModule,
    BlogsModule, 
  ],
  controllers: [PostController, PublicPostController],
  providers: [PostService, PostStatsService],
  exports: [PostService],
})
export class PostModule {}