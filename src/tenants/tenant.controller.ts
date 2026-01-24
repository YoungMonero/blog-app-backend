import { 
  Controller, 
  Post, 
  Body, 
  UseGuards, 
  Req, 
  Get, 
  BadRequestException, 
  Param, 
  NotFoundException 
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './tenant.dto';

@Controller('tenants')
export class TenantController {
  constructor(
    private tenantService: TenantService,
    private jwtService: JwtService,
  ) {}

  @Get('slug/:slug')
  @UseGuards(JwtAuthGuard)
  async getBySlug(@Param('slug') slug: string) {
    const blog = await this.tenantService.findBySlug(slug);

    if (!blog) {
      throw new NotFoundException(`Blog with URL "${slug}" not found`);
    }

    return {
      blog: {
        id: blog._id,
        title: blog.name,
        slug: blog.slug,
        description: blog.description,
        // .toISOString() ensures it's a string for the frontend
        createdAt: (blog as any).createdAt, 
      },
    };
  }

  @Post('create')
  @UseGuards(JwtAuthGuard)
  async createBlog(
    @Body() dto: CreateTenantDto,
    @Req() req,
  ) {
    const userId = req.user.userId || req.user.sub;

    const existingBlog = await this.tenantService.findByOwner(userId);
    if (existingBlog) {
      throw new BadRequestException('You already have a blog!');
    }

    const existingSlug = await this.tenantService.findBySlug(dto.slug);
    if (existingSlug) {
      throw new BadRequestException(`Blog URL "${dto.slug}" is already taken`);
    }

    const blog = await this.tenantService.createTenant(dto, userId);

    const newToken = this.jwtService.sign({
      sub: req.user.sub,
      userId: req.user.userId,
      email: req.user.email,
      username: req.user.username,
      role: 'author',
      hasBlog: true,
      tenantId: blog._id.toString(),
    });

    return {
      message: 'Blog created! You can now write posts.',
      blog: {
        id: blog._id,
        name: blog.name,
        slug: blog.slug,
        description: blog.description,
      },
      accessToken: newToken,
    };
  }

  @Get('check')
  @UseGuards(JwtAuthGuard)
  async checkBlogStatus(@Req() req) {
    const userId = req.user.userId || req.user.sub;
    const blog = await this.tenantService.findByOwner(userId);

    return {
      hasBlog: !!blog,
      blog: blog ? {
        id: blog._id,
        name: blog.name,
        slug: blog.slug,
      } : null,
      canCreateBlog: !blog,
    };
  }
}