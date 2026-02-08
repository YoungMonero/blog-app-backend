import { 
  Controller, Get, Param, NotFoundException, 
  Logger, Query, BadRequestException 
} from '@nestjs/common';
import { PostService } from './post.service';
import { BlogsService } from '../blogs/blogs.service'; 
import { TenantService } from '../tenants/tenant.service';
import { Blog } from '../blogs/blog.schema';

@Controller('public')
export class PublicPostController {
  private readonly logger = new Logger(PublicPostController.name);

  constructor(
    private readonly postService: PostService,
    private readonly tenantService: TenantService,
    private readonly blogsService: BlogsService,
  ) {}

  @Get('post/:slug')
  async getPublicPostBySlug(@Param('slug') slug: string) {
    this.logger.log(`Public fetch for slug: ${slug}`);
    
    const post = await this.postService.findBySlugPublic(slug);
    
    if (!post) {
      throw new NotFoundException('Post not found');
    }

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
    
    const skip = (page - 1) * limit;
    const [posts, total] = await Promise.all([
      this.postService.findAllPublished(skip, limit),
      this.postService.countAllPublished()
    ]);
    
    this.logger.log(`Found ${posts.length} published posts`);
    
    return {
      success: true,
      data: {
        posts: await Promise.all(posts.map(post => this.transformPost(post))),
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / limit)
        }
      }
    };
  }

  @Get('popular')
  async getPopular() {
    this.logger.log('Fetching popular posts');
    const posts = await this.postService.getPopularPosts(5);
    return {
      success: true,
      data: await Promise.all(posts.map(post => this.transformPost(post)))
    };
  }

  @Get('featured')
  async getFeatured() {
    this.logger.log('Fetching editor picks');
    const posts = await this.postService.getEditorsPicks(3);
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
    
    const skip = (page - 1) * limit;
    const [posts, total] = await Promise.all([
      this.postService.findPublishedByTenant(tenantId, skip, limit),
      this.postService.countPublishedByTenant(tenantId)
    ]);
    
    this.logger.log(`Found ${posts.length} published posts for tenant ID: ${tenantId}`);
    
    return {
      success: true,
      data: {
        blog: blogInfo,
        posts: await Promise.all(posts.map(post => this.transformPost(post))),
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / limit)
        }
      }
    };
  }

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
        posts: await Promise.all(posts.map(post => this.transformPost(post))),
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / limit)
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
    
    const skip = (page - 1) * limit;
    const [posts, total] = await Promise.all([
      this.postService.search(query, tenant._id.toString(), skip, limit),
      this.postService.searchCount(query, tenant._id.toString())
    ]);
    
    return {
      success: true,
      data: {
        query,
        posts: await Promise.all(posts.map(post => this.transformPost(post))),
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / limit)
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
    
    this.logger.log(`Post retrieved: ${postSlug} with tags: ${JSON.stringify(post.tags)}`);
    
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
        posts: await Promise.all(posts.map(post => this.transformPost(post))),
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / limit)
        }
      }
    };
  }

  private async transformPost(post: any) {
    // Fetch blog data using tenantId
    let blogData: any = null; // Use any temporarily or import Blog type
    
    if (post.tenantId?._id) {
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
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      thumbnail: post.thumbnail || undefined,
      thumbnailPublicId: post.thumbnailPublicId || undefined, 
      tags: post.tags || [],
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
      readingTime: this.calculateReadingTime(post.content) // Fixed method name
    };
  }

  private calculateReadingTime(content: string): number {
    const wordsPerMinute = 200;
    const words = content.trim().split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  }}