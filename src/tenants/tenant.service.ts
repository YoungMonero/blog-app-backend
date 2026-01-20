import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant, TenantDocument } from './tenant.schema';

@Injectable()
export class TenantService {
  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
  ) {}

  // 1. CREATE: Used during registration or first setup
  async createTenant(name: string, slug: string, userId: string): Promise<TenantDocument> {
    // Ensure slug is URL-friendly
    const sanitizedSlug = this.sanitizeSlug(slug);

    const exists = await this.tenantModel.findOne({ slug: sanitizedSlug });
    if (exists) {
      throw new ConflictException('This blog URL is already taken');
    }

    const tenant = new this.tenantModel({
      name,
      slug: sanitizedSlug,
      userId, // Linking to the User account
    });

    return tenant.save();
  }

  // 2. PUBLIC RESOLVER: Critical for your PublicPostController
  async findBySlug(slug: string): Promise<TenantDocument> {
    const tenant = await this.tenantModel.findOne({ slug }).exec();
    if (!tenant) {
      throw new NotFoundException('Blog not found');
    }
    return tenant;
  }

  // 3. OWNER LOOKUP: Used for Dashboard settings
  async findByOwner(userId: string): Promise<TenantDocument> {
    const tenant = await this.tenantModel.findOne({ userId }).exec();
    if (!tenant) {
      throw new NotFoundException('No blog found for this user');
    }
    return tenant;
  }

  // Helper to ensure slugs never have spaces or weird characters
  private sanitizeSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '');
  }
}