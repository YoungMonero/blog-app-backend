import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Tenant } from './tenant.schema';
import { CreateTenantDto } from './tenant.dto';

@Injectable()
export class TenantService {
  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<Tenant>,
  ) {}

  // ✅ Add this method
  async createTenant(dto: CreateTenantDto, userId: string): Promise<Tenant> {
    // Check if slug already exists
    const existingSlug = await this.tenantModel.findOne({ slug: dto.slug });
    if (existingSlug) {
      throw new BadRequestException('Slug already exists');
    }

    // Check if user already has a tenant
    const existingUserTenant = await this.tenantModel.findOne({
      $or: [
        { owner: userId },
        { userId: userId }
      ]
    });
    
    if (existingUserTenant) {
      throw new BadRequestException('User already has a tenant/blog');
    }

    const tenant = new this.tenantModel({
      ...dto,
      owner: userId,
      userId: userId,
    });

    return tenant.save();
  }

  // ✅ Add this method
  async findByOwner(userId: string): Promise<Tenant | null> {
    return this.tenantModel.findOne({
      $or: [
        { owner: userId },
        { userId: userId }
      ]
    }).exec();
  }

  // ✅ Add this method (if not exists)
  async findByUserId(userId: string): Promise<Tenant | null> {
    return this.findByOwner(userId); // Same as findByOwner
  }

  // ✅ Add this method (if not exists)
  async findAll(): Promise<Tenant[]> {
    return this.tenantModel.find().exec();
  }

  // ✅ Add this method (if not exists)
  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.tenantModel.findOne({ slug }).exec();
  }

  // ✅ Add this method (if not exists)
  async findById(id: string): Promise<Tenant | null> {
    return this.tenantModel.findById(id).exec();
  }
}