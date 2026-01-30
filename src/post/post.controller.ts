import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  UseGuards, Req, ForbiddenException, BadRequestException,
  UseInterceptors, UploadedFile, ParseFilePipe,
  MaxFileSizeValidator, FileTypeValidator, Logger, NotFoundException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HasBlogGuard } from '../common/guards/has-blog.guard';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Controller('posts')
@UseGuards(JwtAuthGuard, HasBlogGuard)
export class PostController {
  private readonly logger = new Logger(PostController.name);

  constructor(
    private readonly postService: PostService,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  // ==================================================================
  // 1. NEW ENDPOINT: Dedicated Thumbnail Upload
  // ==================================================================
  @Post('thumbnail')
  @UseInterceptors(FileInterceptor('thumbnail'))
  async uploadThumbnail(
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: true,
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|gif|webp)$/ }),
        ],
      })
    ) file: Express.Multer.File,
    @Req() req
  ) {
    try {
      this.logger.log(`Uploading thumbnail for user: ${req.user?.userId || req.user?.sub}`);
      
      const upload = await this.cloudinaryService.uploadImage(file, 'blog-posts');
      
      this.logger.log(`Thumbnail uploaded successfully: ${upload.url}`);

      return {
        success: true,
        message: 'Thumbnail uploaded successfully',
        data: {
          url: upload.url,
          publicId: upload.publicId
        }
      };
    } catch (error) {
      this.logger.error('Thumbnail upload failed:', error.message);
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
  }

  // ==================================================================
  // 2. CREATE POST: Now data-only (Frontend sends URL from step 1)
  // ==================================================================
  @Post()
  async create(@Body() createPostDto: CreatePostDto, @Req() req) {
    try {
      this.logger.log(`Creating post for user: ${req.user?.userId || req.user?.sub}`);
      
      // Validation
      if (!createPostDto.title || !createPostDto.content) {
        throw new BadRequestException('Title and content are required');
      }
      if (createPostDto.tags && !Array.isArray(createPostDto.tags)) {
        throw new BadRequestException('Tags must be an array');
      }
      if (createPostDto.excerpt && createPostDto.excerpt.length < 10) {
        throw new BadRequestException('Excerpt must be at least 10 characters');
      }
      if (createPostDto.seoDescription && (createPostDto.seoDescription.length < 20 || createPostDto.seoDescription.length > 160)) {
        throw new BadRequestException('SEO description must be between 20 and 160 characters');
      }
      
      const authorId = createPostDto.authorId || req.user.sub || req.user.userId;
      const tenantId = req.user.tenantId;

      if (!authorId) throw new BadRequestException('Author ID is required');
      if (!tenantId) throw new ForbiddenException('No blog/tenant associated with this account.');

      // Construct Post Data
      // Note: We expect 'thumbnail' and 'thumbnailPublicId' to be in createPostDto now
      const postData: any = {
        title: createPostDto.title,
        content: createPostDto.content,
        slug: createPostDto.slug,
        excerpt: createPostDto.excerpt,
        tags: createPostDto.tags || [],
        seoDescription: createPostDto.seoDescription,
        status: createPostDto.status ?? 'published',
        thumbnail: createPostDto.thumbnail || null,
        thumbnailPublicId: createPostDto.thumbnailPublicId || undefined,
        authorId: authorId,
      };

      const result = await this.postService.create(postData, authorId, tenantId);
      
      this.logger.log(`Post created successfully: ${result._id}`);
      
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

  // ==================================================================
  // 3. UPDATE POST: Now data-only, but handles cleaning up old images
  // ==================================================================
  @Patch(':id')
  async update(
    @Param('id') id: string, 
    @Body() updatePostDto: UpdatePostDto, 
    @Req() req
  ) {
    try {
      this.logger.log(`Updating post: ${id}`);
      
      // Validation
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

      if (!tenantId) throw new ForbiddenException('Access denied: Missing tenant context.');

      // Get current post to check for existing thumbnail logic
      const currentPost = await this.postService.findOne(id);
      if (!currentPost) {
        throw new NotFoundException('Post not found');
      }

      // LOGIC: Delete old image from Cloudinary if a NEW image is provided or if image is removed
      // We check if a new publicId is provided AND it is different from the old one
      if (
        updatePostDto.thumbnailPublicId && 
        currentPost.thumbnailPublicId && 
        updatePostDto.thumbnailPublicId !== currentPost.thumbnailPublicId
      ) {
        this.logger.log(`New thumbnail detected. Deleting old thumbnail: ${currentPost.thumbnailPublicId}`);
        try {
          await this.cloudinaryService.deleteImage(currentPost.thumbnailPublicId);
        } catch (e) {
          this.logger.warn(`Failed to delete old thumbnail: ${e.message}`);
        }
      }
      
      // LOGIC: If thumbnail is explicitly set to null (removed by user)
      if (updatePostDto.thumbnail === null && currentPost.thumbnailPublicId) {
        this.logger.log(`Thumbnail removal detected. Deleting: ${currentPost.thumbnailPublicId}`);
        try {
          await this.cloudinaryService.deleteImage(currentPost.thumbnailPublicId);
        } catch (e) {
           this.logger.warn(`Failed to delete old thumbnail: ${e.message}`);
        }
      }

      const updateData: any = {
        ...updatePostDto
      };

      // Clean undefined fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) delete updateData[key];
      });

      const result = await this.postService.update(id, updateData, userId, tenantId);
      
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

  // ==================================================================
  // READ & DELETE (No major changes, just kept for context)
  // ==================================================================
  @Get()
  async findAll(@Req() req) {
    const tenantId = req.user.tenantId;
    if (!tenantId) throw new ForbiddenException('Access denied: No tenant ID found in token.');
    
    const posts = await this.postService.findAllByTenant(tenantId);
    return { success: true, count: posts.length, data: posts };
  }

  @Get(':identifier')
  async findOne(@Param('identifier') identifier: string, @Req() req) {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.sub || req.user?.userId;

    const post = await this.postService.findByIdOrSlug(identifier, tenantId);

    if (!post) throw new NotFoundException('Post not found');
    if (post.tenantId.toString() !== tenantId) throw new ForbiddenException('You do not have permission to view this post');
    if (!userId || post.authorId.toString() !== userId) throw new ForbiddenException('You do not have permission to view this draft');

    return { success: true, data: post };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req) {
    try {
      const userId = req.user.sub || req.user.userId;
      const tenantId = req.user.tenantId;
      
      if (!tenantId) throw new ForbiddenException('Access denied: Missing tenant context.');

      const post = await this.postService.findOne(id);
      if (post?.thumbnailPublicId) {
        try {
          await this.cloudinaryService.deleteImage(post.thumbnailPublicId);
        } catch (e) {
          this.logger.warn(`Failed to delete thumbnail: ${e.message}`);
        }
      }

      await this.postService.remove(id, userId, tenantId);
      
      return { success: true, message: 'Post deleted successfully' };
    } catch (error) {
      this.logger.error('Delete Post Error:', error.message, error.stack);
      throw error;
    }
  }

}