import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  UseGuards, Req, ForbiddenException, BadRequestException,
  UseInterceptors, UploadedFile, ParseFilePipe,
  MaxFileSizeValidator, FileTypeValidator, Logger, NotFoundException, SetMetadata
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HasBlogGuard } from '../common/guards/has-blog.guard';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Types } from 'mongoose';

@Controller('posts')
@UseGuards(JwtAuthGuard, HasBlogGuard)
export class PostController {
  private readonly logger = new Logger(PostController.name);

  constructor(
    private readonly postService: PostService,
    private readonly cloudinaryService: CloudinaryService
  ) { }

  @Post()
  @UseInterceptors(FileInterceptor('thumbnail'))
  async create(
    @Body() createPostDto: CreatePostDto,
    @Req() req,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|gif|webp)$/ }),
        ],
      })
    ) file?: Express.Multer.File
  ) {
    try {
      this.logger.log(`Creating post for user: ${req.user?.userId || req.user?.sub}`);
      this.logger.log(`Received data: ${JSON.stringify(createPostDto)}`);

      // Validate required fields
      if (!createPostDto.title || !createPostDto.content) {
        throw new BadRequestException('Title and content are required');
      }

      // Validate optional fields if provided
      if (createPostDto.tags && !Array.isArray(createPostDto.tags)) {
        throw new BadRequestException('Tags must be an array');
      }

      if (createPostDto.excerpt && createPostDto.excerpt.length < 10) {
        throw new BadRequestException('Excerpt must be at least 10 characters');
      }

      if (createPostDto.seoDescription && (createPostDto.seoDescription.length < 20 || createPostDto.seoDescription.length > 160)) {
        throw new BadRequestException('SEO description must be between 20 and 160 characters');
      }

      const userId = req.user.sub || req.user.userId;
      const tenantId = req.user.tenantId;

      if (!userId || !tenantId) {
        this.logger.error('Missing user ID or tenant ID');
        throw new ForbiddenException('No blog/tenant associated with this account.');
      }

      let thumbnailUrl: string | undefined;
      let thumbnailPublicId: string | undefined;

      // Handle file upload if present
      if (file) {
        this.logger.log(`Uploading thumbnail: ${file.originalname} (${file.size} bytes)`);

        try {
          const upload = await this.cloudinaryService.uploadImage(file, 'blog-posts');
          thumbnailUrl = upload.url;
          thumbnailPublicId = upload.publicId;
          this.logger.log(`Thumbnail uploaded to: ${thumbnailUrl}`);
        } catch (uploadError) {
          this.logger.error('Cloudinary upload failed:', uploadError.message);
          throw new BadRequestException(`Thumbnail upload failed: ${uploadError.message}`);
        }
      }

      // Create post with explicit thumbnail field - ensure it's always included
      // Using a more explicit approach to ensure fields are passed
      const postData: any = {
        title: createPostDto.title,
        content: createPostDto.content,
        slug: createPostDto.slug,
        excerpt: createPostDto.excerpt,
        tags: createPostDto.tags || [],
        seoDescription: createPostDto.seoDescription,
        status: createPostDto.status ?? 'published',
        // Explicitly include thumbnail fields - very important!
        thumbnail: thumbnailUrl ?? createPostDto.thumbnail ?? null,
        thumbnailPublicId: thumbnailPublicId ?? undefined,
      };

      // Debug logging
      this.logger.log(`Post data to save: ${JSON.stringify({
        title: postData.title,
        hasThumbnail: !!postData.thumbnail,
        thumbnail: postData.thumbnail,
        thumbnailPublicId: postData.thumbnailPublicId,
        thumbnailFieldExists: 'thumbnail' in postData
      })}`);

      const result = await this.postService.create(postData, userId, tenantId);

      // Log what was actually saved
      this.logger.log(`Post created successfully: ${result._id}`);
      this.logger.log(`Saved post thumbnail: ${result.thumbnail}`);
      this.logger.log(`Has thumbnail field in saved document: ${'thumbnail' in result}`);

      return {
        success: true,
        message: 'Post created successfully',
        data: result
      };
    } catch (error) {
      this.logger.error('Create Post Error:', error.message, error.stack);
      throw error;
    }
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('thumbnail'))
  async update(
    @Param('id') id: string,
    @Body() updatePostDto: UpdatePostDto,
    @Req() req,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|gif|webp)$/ }),
        ],
      })
    ) file?: Express.Multer.File
  ) {
    try {
      this.logger.log(`Updating post: ${id}`);

      // Validate optional fields if provided
      if (updatePostDto.tags && !Array.isArray(updatePostDto.tags)) {
        throw new BadRequestException('Tags must be an array');
      }

      if (updatePostDto.excerpt && updatePostDto.excerpt.length < 10) {
        throw new BadRequestException('Excerpt must be at least 10 characters');
      }

      if (updatePostDto.seoDescription && (updatePostDto.seoDescription.length < 20 || updatePostDto.seoDescription.length > 160)) {
        throw new BadRequestException('SEO description must be between 20 and 160 characters');
      }

      const userId = req.user.sub || req.user.userId;
      const tenantId = req.user.tenantId;

      if (!tenantId) {
        throw new ForbiddenException('Access denied: Missing tenant context.');
      }

      // Get current post to check for existing thumbnail
      const currentPost = await this.postService.findOne(id);
      if (!currentPost) {
        throw new NotFoundException('Post not found');
      }

      let thumbnailUrl: string | null | undefined = updatePostDto.thumbnail;
      let thumbnailPublicId: string | null | undefined = currentPost.thumbnailPublicId;

      // Handle file upload if present
      if (file) {
        this.logger.log(`Uploading new thumbnail for post ${id}`);

        // Delete old thumbnail from Cloudinary if exists
        if (currentPost.thumbnailPublicId) {
          try {
            await this.cloudinaryService.deleteImage(currentPost.thumbnailPublicId);
            this.logger.log(`Deleted old thumbnail: ${currentPost.thumbnailPublicId}`);
          } catch (deleteError) {
            this.logger.warn(`Failed to delete old thumbnail: ${deleteError.message}`);
          }
        }

        // Upload new thumbnail
        try {
          const upload = await this.cloudinaryService.uploadImage(file, 'blog-posts');
          thumbnailUrl = upload.url;
          thumbnailPublicId = upload.publicId;
          this.logger.log(`New thumbnail uploaded: ${thumbnailUrl}`);
        } catch (uploadError) {
          this.logger.error('Cloudinary upload failed:', uploadError.message);
          throw new BadRequestException(`Thumbnail upload failed: ${uploadError.message}`);
        }
      } else if (updatePostDto.thumbnail === null || updatePostDto.thumbnail === '') {

        if (currentPost.thumbnailPublicId) {
          try {
            await this.cloudinaryService.deleteImage(currentPost.thumbnailPublicId);
            this.logger.log(`Deleted thumbnail for post ${id}`);
          } catch (deleteError) {
            this.logger.warn(`Failed to delete thumbnail: ${deleteError.message}`);
          }
        }
        thumbnailUrl = null;
        thumbnailPublicId = null;
      } else if (updatePostDto.thumbnail === undefined) {
        // If thumbnail is not being modified, keep the existing value
        thumbnailUrl = currentPost.thumbnail;
        thumbnailPublicId = currentPost.thumbnailPublicId;
      } else {
        // Thumbnail URL was provided explicitly (not uploaded). Clear publicId unless explicitly provided.
        thumbnailPublicId = updatePostDto.thumbnailPublicId ?? null;
      }

      // Create update data with explicit thumbnail field
      const updateData: any = {
        title: updatePostDto.title,
        content: updatePostDto.content,
        slug: updatePostDto.slug,
        excerpt: updatePostDto.excerpt,
        tags: updatePostDto.tags,
        seoDescription: updatePostDto.seoDescription,
        status: updatePostDto.status,
        // Explicitly include thumbnail fields
        thumbnail: thumbnailUrl,
        thumbnailPublicId: thumbnailPublicId,
      };

      // Remove undefined values to avoid overwriting with undefined
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      this.logger.log(`Post update data: ${JSON.stringify(updateData)}`);
      this.logger.log(`Thumbnail in update: ${updateData.thumbnail}`);
      this.logger.log(`Has thumbnail field in update: ${'thumbnail' in updateData}`);

      const result = await this.postService.update(id, updateData, userId, tenantId);
      this.logger.log(`Post updated successfully: ${id}`);

      return {
        success: true,
        message: 'Post updated successfully',
        data: result
      };
    } catch (error) {
      this.logger.error('Update Post Error:', error.message, error.stack);
      throw error;
    }
  }

  @Get()
  async findAll(@Req() req) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Access denied: No tenant ID found in token.');
    }

    this.logger.log(`Fetching all posts for tenant: ${tenantId}`);
    const posts = await this.postService.findAllByTenant(tenantId);

    return {
      success: true,
      count: posts.length,
      data: posts
    };
  }

  @Get(':identifier')
  async findOne(@Param('identifier') identifier: string, @Req() req) {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.sub || req.user?.userId;

    // We call the service, we don't use postModel here!
    const post = await this.postService.findByIdOrSlug(identifier, tenantId);

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.status === 'published') {
      return { success: true, data: post };
    }


    if (!userId || post.authorId.toString() !== userId) {
      throw new ForbiddenException('You do not have permission to view this draft');
    }

    return {
      success: true,
      data: post
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req) {
    try {
      this.logger.log(`Deleting post: ${id}`);

      const userId = req.user.sub || req.user.userId;
      const tenantId = req.user.tenantId;

      if (!tenantId) {
        throw new ForbiddenException('Access denied: Missing tenant context.');
      }

      // Get post to check for thumbnail
      const post = await this.postService.findOne(id);
      if (post?.thumbnailPublicId) {
        try {
          await this.cloudinaryService.deleteImage(post.thumbnailPublicId);
          this.logger.log(`Deleted thumbnail: ${post.thumbnailPublicId}`);
        } catch (deleteError) {
          this.logger.warn(`Failed to delete thumbnail: ${deleteError.message}`);
        }
      }

      await this.postService.remove(id, userId, tenantId);
      this.logger.log(`Post deleted successfully: ${id}`);

      return {
        success: true,
        message: 'Post deleted successfully'
      };
    } catch (error) {
      this.logger.error('Delete Post Error:', error.message, error.stack);
      throw error;
    }
  }

}