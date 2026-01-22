import { 
  Controller, Get, Post, Body, Patch, Param, Delete, 
  UseGuards, Req, ForbiddenException, BadRequestException 
} from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HasBlogGuard } from '../common/guards/has-blog.guard'

@Controller('posts')
@UseGuards(JwtAuthGuard, HasBlogGuard)
export class PostController {

  constructor(
    private readonly postService: PostService
  ) {}
 
  @Post()
  @UseGuards(JwtAuthGuard, HasBlogGuard)  
  async create(@Body() createPostDto: CreatePostDto, @Req() req) {
    try {
      const userId = req.user.sub || req.user.userId;
      const tenantId = req.user.tenantId;

      console.log('--- Post Create Debug ---');
      console.log('User ID:', userId);
      console.log('Tenant ID from Token:', tenantId);


      if (!tenantId) {
        console.error('ERROR: User token missing tenantId. User must re-login.');
        throw new ForbiddenException('No blog/tenant associated with this account payload.');
      }

      return await this.postService.create(createPostDto, userId, tenantId);
    } catch (error) {
      console.error('Create Post Error:', error.message);
      throw error;
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard, HasBlogGuard) 
  async findAll(@Req() req) {
    const tenantId = req.user.tenantId;
    
    if (!tenantId) {
      throw new ForbiddenException('Access denied: No tenant ID found in token.');
    }

    console.log(`Fetching all posts for Tenant: ${tenantId}`);
    return this.postService.findAllByTenant(tenantId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, HasBlogGuard) 
  async update(
    @Param('id') id: string, 
    @Body() updatePostDto: UpdatePostDto, 
    @Req() req
  ) {
    const userId = req.user.sub || req.user.userId;
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      throw new ForbiddenException('Access denied: Missing tenant context.');
    }
    
    return this.postService.update(id, updatePostDto, userId, tenantId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, HasBlogGuard) 
  async remove(@Param('id') id: string, @Req() req) {
    const userId = req.user.sub || req.user.userId;
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      throw new ForbiddenException('Access denied: Missing tenant context.');
    }

    return this.postService.remove(id, userId, tenantId);
  }
}