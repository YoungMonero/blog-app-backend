import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PostController } from './post.controller';
import { PublicPostController } from './public-post.controller';
import { PostService } from './post.service';
import { Post, PostSchema } from './post.schema';
import { UsersModule } from '../users/users.module'; 
import { AuthModule } from '../auth/auth.module'; 

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Post.name, schema: PostSchema }]),
    UsersModule,
    AuthModule,
  ],
  controllers: [PostController, PublicPostController],
  providers: [PostService],
  exports: [PostService],
})
export class PostModule {}