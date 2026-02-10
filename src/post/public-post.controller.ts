import { 
  Controller, Get, Param, NotFoundException, 
  Logger, Query, BadRequestException 
} from '@nestjs/common';
import { PostService } from './post.service';
import { BlogsService } from '../blogs/blogs.service'; 
import { TenantService } from '../tenants/tenant.service';
import { PostStatsService } from '../post/post-stats.service'; 

@Controller('public')
export class PublicPostController {
  private readonly logger = new Logger(PublicPostController.name);

  constructor(
    private readonly postService: PostService,
    private readonly tenantService: TenantService,
    private readonly blogsService: BlogsService,
    private readonly postStatsService: PostStatsService,
    private readonly postGateway: any, // Use your actual PostGateway type
  ) {}

  @Get('post/:slug')
  async getPublicPostBySlug(@Param('slug') slug: string) {
    this.logger.log(`Public fetch for slug: ${slug}`);
    
    const post = await this.postService.findBySlugPublic(slug);
    
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    
    // Emit WebSocket event for single post view
    this.emitPostViewed(post._id.toString(), 'single-view');

    return {
      success: true,
      data: await this.transformPost(post)
    };
  }

  @Get()
  async getAllPublicPosts(
    @Query('page') page = 1,
    @Query('limit') limit = 20
  ) {
    this.logger.log('Fetching all published posts');
    
    const validatedPage = Math.max(1, Number(page));
    const validatedLimit = Math.min(Math.max(1, Number(limit)), 100); 
    
    const skip = (validatedPage - 1) * validatedLimit;
    const [posts, total] = await Promise.all([
      this.postService.findAllPublished(skip, validatedLimit),
      this.postService.countAllPublished()
    ]);
    
    this.logger.log(`Found ${posts.length} published posts`);
    
    // Emit WebSocket event for list view
    this.emitPostsListed(posts.length, validatedPage);

    return {
      success: true,
      data: {
        posts: await Promise.all(posts.map(post => this.transformPost(post))),
        pagination: {
          total,
          page: validatedPage,
          limit: validatedLimit,
          totalPages: Math.ceil(total / validatedLimit)
        }
      }
    };
  }

  @Get('popular')
  async getPopular() {
    this.logger.log('Fetching popular posts');
    const posts = await this.postService.getPopularPosts(5);
    
    // Emit WebSocket event for popular posts view
    this.emitPostsListed(posts.length, 1, 'popular');

    return {
      success: true,
      data: await Promise.all(posts.map(post => this.transformPost(post)))
    };
  }

  @Get('featured')
  async getFeatured() {
    this.logger.log('Fetching editor picks');
    const posts = await this.postService.getEditorsPicks(3);
    
    // Emit WebSocket event for featured posts view
    this.emitPostsListed(posts.length, 1, 'featured');

    return {
      success: true,
      data: await Promise.all(posts.map(post => this.transformPost(post)))
    };
  }

  @Get('tenant/:tenantId')
  async getPostsByTenantId(
    @Param('tenantId') tenantId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10
  ) {
    this.logger.log(`Fetching published posts for tenant ID: ${tenantId}`);
    
    if (!tenantId || tenantId.trim() === '') {
      throw new BadRequestException('Tenant ID is required');
    }
    
    const tenant = await this.tenantService.findById(tenantId);
    if (!tenant) {
      this.logger.warn(`Tenant not found for ID: ${tenantId}`);
      throw new NotFoundException('Tenant not found');
    }

    const blogInfo = {
      id: tenant._id,
      name: tenant.name,
      slug: tenant.slug,
      description: tenant.description,
      logo: tenant.logo,
      coverImage: tenant.coverImage,
      createdAt: tenant.createdAt,
      owner: tenant.owner 
    };
    
    const validatedPage = Math.max(1, Number(page));
    const validatedLimit = Math.min(Math.max(1, Number(limit)), 50);
    
    const skip = (validatedPage - 1) * validatedLimit;
    const [posts, total] = await Promise.all([
      this.postService.findPublishedByTenant(tenantId, skip, validatedLimit),
      this.postService.countPublishedByTenant(tenantId)
    ]);
    
    this.logger.log(`Found ${posts.length} published posts for tenant ID: ${tenantId}`);
    
    // Emit WebSocket event for tenant posts view
    this.emitTenantPostsListed(tenantId, posts.length, validatedPage);

    return {
      success: true,
      data: {
        blog: blogInfo,
        posts: await Promise.all(posts.map(post => this.transformPost(post))),
        pagination: {
          total,
          page: validatedPage,
          limit: validatedLimit,
          totalPages: Math.ceil(total / validatedLimit)
        }
      }
    };
  }

  @Get(':tenantSlug/categories')
  async getTenantCategories(@Param('tenantSlug') tenantSlug: string) {
    const tenant = await this.tenantService.findBySlug(tenantSlug);
    if (!tenant) {
      throw new NotFoundException('Blog not found');
    }
    
    const categories = await this.postService.getCategories(tenant._id.toString());
    
    // Emit WebSocket event for categories view
    this.emitCategoriesViewed(tenant._id.toString(), categories.length);

    return {
      success: true,
      data: {
        categories,
        count: categories.length
      }
    };
  }

  @Get(':tenantSlug/category/:category')
  async getPostsByCategory(
    @Param('tenantSlug') tenantSlug: string,
    @Param('category') category: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10
  ) {
    this.logger.log(`Fetching posts with category "${category}" from blog: ${tenantSlug}`);
    
    const tenant = await this.tenantService.findBySlug(tenantSlug);
    if (!tenant) {
      throw new NotFoundException('Blog not found');
    }
    
    if (!category || category.trim() === '') {
      throw new BadRequestException('Category is required');
    }
    
    const validatedPage = Math.max(1, Number(page));
    const validatedLimit = Math.min(Math.max(1, Number(limit)), 50);
    
    const result = await this.postService.findByCategory(
      category, 
      tenant._id.toString(), 
      validatedPage, 
      validatedLimit
    );
    
    // Emit WebSocket event for category posts view
    this.emitCategoryPostsViewed(tenant._id.toString(), category, result.posts.length, validatedPage);

    return {
      success: true,
      data: {
        category,
        posts: await Promise.all(result.posts.map(post => this.transformPost(post))),
        pagination: {
          total: result.total,
          page: validatedPage,
          limit: validatedLimit,
          totalPages: result.totalPages
        }
      }
    };
  }

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
    
    const validatedPage = Math.max(1, Number(page));
    const validatedLimit = Math.min(Math.max(1, Number(limit)), 50);
    
    const skip = (validatedPage - 1) * validatedLimit;
    const [posts, total] = await Promise.all([
      this.postService.search(query, tenant._id.toString(), skip, validatedLimit),
      this.postService.searchCount(query, tenant._id.toString())
    ]);
    
    // Emit WebSocket event for search
    this.emitSearchPerformed(tenant._id.toString(), query, posts.length, validatedPage);

    return {
      success: true,
      data: {
        query,
        posts: await Promise.all(posts.map(post => this.transformPost(post))),
        pagination: {
          total,
          page: validatedPage,
          limit: validatedLimit,
          totalPages: Math.ceil(total / validatedLimit)
        }
      }
    };
  }

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
    
    // Increment view count (handle gracefully if it fails)
    try {
      await this.postStatsService.incrementViews(post._id.toString());
    } catch (error) {
      this.logger.warn(`Failed to increment view count for post ${post._id}: ${error.message}`);
      // Continue anyway - view counting is secondary to post retrieval
    }
    
    // Emit WebSocket event for detailed post view with tenant context
    this.emitPostViewed(post._id.toString(), 'detailed-view', {
      tenantId: tenant._id.toString(),
      tenantSlug: tenant.slug,
      postSlug: post.slug
    });
    
    this.logger.log(`Post retrieved: ${postSlug} with categories: ${JSON.stringify(post.categories)}`);
    
    return {
      success: true,
      data: await this.transformPost(post)
    };
  }

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
    
    const blogInfo = {
      id: tenant._id,
      name: tenant.name,
      slug: tenant.slug,
      description: tenant.description,
      logo: tenant.logo,
      coverImage: tenant.coverImage,
      createdAt: tenant.createdAt,
      owner: tenant.owner 
    };
    
    const validatedPage = Math.max(1, Number(page));
    const validatedLimit = Math.min(Math.max(1, Number(limit)), 50);
    
    const skip = (validatedPage - 1) * validatedLimit;
    const [posts, total] = await Promise.all([
      this.postService.findPublishedByTenant(tenant._id.toString(), skip, validatedLimit),
      this.postService.countPublishedByTenant(tenant._id.toString())
    ]);
    
    this.logger.log(`Found ${posts.length} published posts for blog: ${tenantSlug}`);
    
    // Emit WebSocket event for tenant homepage view
    this.emitTenantHomepageViewed(tenant._id.toString(), tenantSlug, posts.length, validatedPage);

    return {
      success: true,
      data: {
        blog: blogInfo,
        posts: await Promise.all(posts.map(post => this.transformPost(post))),
        pagination: {
          total,
          page: validatedPage,
          limit: validatedLimit,
          totalPages: Math.ceil(total / validatedLimit)
        }
      }
    };
  }

  // ========== WEBSOCKET HELPER METHODS ==========

  private emitPostViewed(postId: string, viewType: string, metadata?: any) {
    try {
      if (this.postGateway?.server) {
        this.postGateway.server.emit('post_viewed', {  
          postId,
          viewType,
          timestamp: new Date().toISOString(),
          ...metadata 
        });
        this.logger.debug(`WebSocket: post_viewed emitted for post ${postId}, type: ${viewType}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to emit post_viewed WebSocket event: ${error.message}`);
    }
  }

  private emitPostsListed(count: number, page: number, listType: string = 'all') {
    try {
      if (this.postGateway?.server) {
        this.postGateway.server.emit('posts_listed', {
          listType,
          count,
          page,
          timestamp: new Date().toISOString()
        });
        this.logger.debug(`WebSocket: posts_listed emitted, type: ${listType}, count: ${count}, page: ${page}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to emit posts_listed WebSocket event: ${error.message}`);
    }
  }

  private emitTenantPostsListed(tenantId: string, count: number, page: number) {
    try {
      if (this.postGateway?.server) {
        this.postGateway.server.emit('tenant_posts_listed', {
          tenantId,
          count,
          page,
          timestamp: new Date().toISOString()
        });
        this.logger.debug(`WebSocket: tenant_posts_listed emitted for tenant ${tenantId}, count: ${count}, page: ${page}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to emit tenant_posts_listed WebSocket event: ${error.message}`);
    }
  }

  private emitCategoriesViewed(tenantId: string, categoryCount: number) {
    try {
      if (this.postGateway?.server) {
        this.postGateway.server.emit('categories_viewed', {
          tenantId,
          categoryCount,
          timestamp: new Date().toISOString()
        });
        this.logger.debug(`WebSocket: categories_viewed emitted for tenant ${tenantId}, count: ${categoryCount}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to emit categories_viewed WebSocket event: ${error.message}`);
    }
  }

  private emitCategoryPostsViewed(tenantId: string, category: string, count: number, page: number) {
    try {
      if (this.postGateway?.server) {
        this.postGateway.server.emit('category_posts_viewed', {
          tenantId,
          category,
          count,
          page,
          timestamp: new Date().toISOString()
        });
        this.logger.debug(`WebSocket: category_posts_viewed emitted for tenant ${tenantId}, category: ${category}, count: ${count}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to emit category_posts_viewed WebSocket event: ${error.message}`);
    }
  }

  private emitSearchPerformed(tenantId: string, query: string, resultCount: number, page: number) {
    try {
      if (this.postGateway?.server) {
        this.postGateway.server.emit('search_performed', {
          tenantId,
          query,
          resultCount,
          page,
          timestamp: new Date().toISOString()
        });
        this.logger.debug(`WebSocket: search_performed emitted for tenant ${tenantId}, query: "${query}", results: ${resultCount}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to emit search_performed WebSocket event: ${error.message}`);
    }
  }

  private emitTenantHomepageViewed(tenantId: string, tenantSlug: string, postCount: number, page: number) {
    try {
      if (this.postGateway?.server) {
        this.postGateway.server.emit('tenant_homepage_viewed', {
          tenantId,
          tenantSlug,
          postCount,
          page,
          timestamp: new Date().toISOString()
        });
        this.logger.debug(`WebSocket: tenant_homepage_viewed emitted for tenant ${tenantId} (${tenantSlug}), posts: ${postCount}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to emit tenant_homepage_viewed WebSocket event: ${error.message}`);
    }
  }

  // ========== TRANSFORM METHODS ==========

  private async transformPost(post: any) {
    // Fetch blog data using tenantId
    let blogData: any = null;
    
    if (post.tenantId && post.tenantId._id) {
      try {
        blogData = await this.blogsService.getBlogByTenant(post.tenantId._id.toString());
      } catch (error) {
        this.logger.warn(`Could not fetch blog for tenant ${post.tenantId._id}: ${error.message}`);
      }
    }

    // Prepare blog object with proper type checking
    const blogObject = blogData ? {
      id: blogData._id,
      title: blogData.title,
      description: blogData.description,
      authorName: blogData.authorName,
      slug: blogData.slug
    } : {
      id: post.tenantId?._id,
      name: post.tenantId?.name,
      slug: post.tenantId?.slug
    };

    return {
      id: post._id,
      title: post.title,
      commentsCount: post.commentsCount || 0,
      views: post.views || 0,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      thumbnail: post.thumbnail || undefined,
      thumbnailPublicId: post.thumbnailPublicId || undefined, 
      categories: post.categories || [],
      seoDescription: post.seoDescription,
      likes: post.likes || 0,
      likedBy: post.likedBy || [],
      author: {
        id: post.authorId?._id,
        username: post.authorId?.username,
        displayName: post.authorId?.displayName || post.authorId?.username,
        profilePicture: post.authorId?.profilePicture,
        bio: post.authorId?.bio
      },
      blog: blogObject,
      status: post.status,
      publishedAt: post.publishedAt,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      readingTime: this.calculateReadingTime(post.content)
    };
  }

  private calculateReadingTime(content: string): number {
    const wordsPerMinute = 200;
    const words = content.trim().split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  }
}