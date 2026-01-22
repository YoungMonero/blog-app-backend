import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantService } from '../tenants/tenant.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(
    private tenantService: TenantService,
  ) {}

  @Get()
  async getDashboard(@Req() req) {
    const user = req.user;
    const userId = user.userId || user.sub;

    const blog = await this.tenantService.findByOwner(userId) as any;

    return {
      user: {
        username: user.username,
        email: user.email,
        role: user.role || 'reader',
        hasBlog: user.hasBlog || false,
      },
      blog: blog ? {
        id: blog._id,
        name: blog.name,
        slug: blog.slug,
        description: blog.description || '',
        createdAt: blog.createdAt, 
        url: `/public/${blog.slug}`,
      } : null,
      quickActions: blog ? [
        {
          title: 'Write New Post',
          description: 'Share your thoughts',
          path: '/posts',
          method: 'POST',
          icon: ''
        },
        {
          title: 'View Your Blog',
          description: 'See how others see it',
          path: `/public/${blog.slug}`,
          method: 'GET',
          icon: ''
        },
      ] : [
        {
          title: 'Create Your Blog',
          description: 'Start publishing your ideas',
          path: '/tenants/create',
          method: 'POST',
          icon: '',
          highlight: true
        },
        {
          title: 'Explore Blogs',
          description: 'Read amazing content',
          path: '/public/blogs',
          method: 'GET',
          icon: ''
        },
      ],
    };
  }
}