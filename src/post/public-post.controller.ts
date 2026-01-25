import { 
  Controller, Get, Param, NotFoundException, 
  Logger, Query, BadRequestException 
} from '@nestjs/common';
import { PostService } from './post.service';
import { TenantService } from '../tenants/tenant.service';

@Controller('public')
export class PublicPostController {
  private readonly logger = new Logger(PublicPostController.name);

  constructor(
    private readonly postService: PostService,
    private readonly tenantService: TenantService,
  ) {}

  // Get blog info with posts (paginated)
  @Get(':tenantSlug')
  async getTenantPosts(
    @Param('tenantSlug') tenantSlug: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10
  ) {
    this.logger.log(`Fetching published posts for blog: ${tenantSlug}`);
    
    const tenant = await this.tenantService.findBySlug(tenantSlug);
    if (!tenant) {
      this.logger.warn(`Blog not found for slug: ${tenantSlug}`);
      throw new NotFoundException('Blog not found');
    }
    
    // Get blog info
    const blogInfo = {
      id: tenant._id,
      name: tenant.name,
      slug: tenant.slug,
      description: tenant.description,
      logo: tenant.logo,
      coverImage: tenant.coverImage,
      createdAt: tenant.createdAt,
      owner: tenant.owner // This should be populated if your tenant schema has owner reference
    };
    
    // Get posts with pagination
    const skip = (page - 1) * limit;
    const [posts, total] = await Promise.all([
      this.postService.findPublishedByTenant(tenant._id.toString(), skip, limit),
      this.postService.countPublishedByTenant(tenant._id.toString())
    ]);
    
    this.logger.log(`Found ${posts.length} published posts for blog: ${tenantSlug}`);
    
    return {
      success: true,
      data: {
        blog: blogInfo,
        posts: posts.map(post => this.transformPost(post)),
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / limit)
        }
      }
    };
  }

  // Get single post
  @Get(':tenantSlug/:postSlug')
  async getPostBySlug(
    @Param('tenantSlug') tenantSlug: string,
    @Param('postSlug') postSlug: string,
  ) {
    this.logger.log(`Fetching post: ${postSlug} from blog: ${tenantSlug}`);
    
    const tenant = await this.tenantService.findBySlug(tenantSlug);
    if (!tenant) {
      this.logger.warn(`Blog not found for slug: ${tenantSlug}`);
      throw new NotFoundException('Blog not found');
    }
    
    const post = await this.postService.findBySlugAndTenant(postSlug, tenant._id.toString());
    if (!post) {
      this.logger.warn(`Post not found: ${postSlug} in blog: ${tenantSlug}`);
      throw new NotFoundException('Post not found');
    }
    
    this.logger.log(`Post retrieved: ${postSlug} with tags: ${JSON.stringify(post.tags)}`);
    
    return {
      success: true,
      data: this.transformPost(post)
    };
  }

  // Get all tags for a blog
  @Get(':tenantSlug/tags')
  async getTenantTags(@Param('tenantSlug') tenantSlug: string) {
    this.logger.log(`Fetching tags for blog: ${tenantSlug}`);
    
    const tenant = await this.tenantService.findBySlug(tenantSlug);
    if (!tenant) {
      throw new NotFoundException('Blog not found');
    }
    
    const tags = await this.postService.getTagsByTenant(tenant._id.toString());
    
    return {
      success: true,
      data: {
        tags,
        count: tags.length
      }
    };
  }

  // Get posts by tag (with pagination)
  @Get(':tenantSlug/tag/:tag')
  async getPostsByTag(
    @Param('tenantSlug') tenantSlug: string,
    @Param('tag') tag: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10
  ) {
    this.logger.log(`Fetching posts with tag "${tag}" from blog: ${tenantSlug}`);
    
    const tenant = await this.tenantService.findBySlug(tenantSlug);
    if (!tenant) {
      throw new NotFoundException('Blog not found');
    }
    
    if (!tag || tag.trim() === '') {
      throw new BadRequestException('Tag is required');
    }
    
    const skip = (page - 1) * limit;
    const [posts, total] = await Promise.all([
      this.postService.findByTag(tag, tenant._id.toString(), skip, limit),
      this.postService.countByTag(tag, tenant._id.toString())
    ]);
    
    return {
      success: true,
      data: {
        tag,
        posts: posts.map(post => this.transformPost(post)),
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / limit)
        }
      }
    };
  }

  // Search posts within a blog
  @Get(':tenantSlug/search')
  async searchPosts(
    @Param('tenantSlug') tenantSlug: string,
    @Query('q') query: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10
  ) {
    if (!query || query.trim() === '') {
      throw new BadRequestException('Search query is required');
    }
    
    const tenant = await this.tenantService.findBySlug(tenantSlug);
    if (!tenant) {
      throw new NotFoundException('Blog not found');
    }
    
    const skip = (page - 1) * limit;
    const [posts, total] = await Promise.all([
      this.postService.search(query, tenant._id.toString(), skip, limit),
      this.postService.searchCount(query, tenant._id.toString())
    ]);
    
    return {
      success: true,
      data: {
        query,
        posts: posts.map(post => this.transformPost(post)),
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / limit)
        }
      }
    };
  }

  // Helper method to transform post data for public API
  private transformPost(post: any) {
    return {
      id: post._id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      thumbnail: post.thumbnail,
      tags: post.tags || [],
      seoDescription: post.seoDescription,
      author: {
        id: post.authorId?._id,
        username: post.authorId?.username,
        displayName: post.authorId?.displayName || post.authorId?.username,
        profilePicture: post.authorId?.profilePicture,
        bio: post.authorId?.bio
      },
      blog: {
        id: post.tenantId?._id,
        name: post.tenantId?.name,
        slug: post.tenantId?.slug
      },
      status: post.status,
      publishedAt: post.publishedAt,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      // Reading time estimation (optional)
      readingTime: this.calculateReadingTime(post.content)
    };
  }

  // Helper method to calculate reading time
  private calculateReadingTime(content: string): number {
    const wordsPerMinute = 200;
    const words = content.trim().split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  }
}