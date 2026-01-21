import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { PostService } from './post.service';
import { TenantService } from '../tenants/tenant.service';

@Controller('public')
export class PublicPostController {
  constructor(
    private readonly postService: PostService,
    private readonly tenantService: TenantService,
  ) {}

  @Get(':tenantSlug')
  async getTenantPosts(@Param('tenantSlug') tenantSlug: string) {
    const tenant = await this.tenantService.findBySlug(tenantSlug);
    if (!tenant) {
      throw new NotFoundException('Blog not found');
    }
    
    return this.postService.findPublishedByTenant(tenant._id.toString());
  }

  @Get(':tenantSlug/:postSlug')
  async getPostBySlug(
    @Param('tenantSlug') tenantSlug: string,
    @Param('postSlug') postSlug: string,
  ) {
    const tenant = await this.tenantService.findBySlug(tenantSlug);
    if (!tenant) {
      throw new NotFoundException('Blog not found');
    }
    
    return this.postService.findBySlugAndTenant(postSlug, tenant._id.toString());
  }
}