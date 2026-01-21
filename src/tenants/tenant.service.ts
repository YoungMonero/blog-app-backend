import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant } from './tenant.schema';
import { CreateTenantDto } from './tenant.dto';


@Injectable()
export class TenantService {
  constructor(
    @InjectModel(Tenant.name)
    private tenantModel: Model<Tenant>,
  ) {}

  async createTenant(
    dto: CreateTenantDto,
    userId: string,
  ) {
    const exists = await this.tenantModel.findOne({ slug: dto.slug });
    if (exists) {
      throw new ConflictException('Blog slug already taken');
    }

    const tenant = new this.tenantModel({
      ...dto,
      owner: userId,
    });

    return tenant.save();
  }

  async findByOwner(userId: string) {
    return this.tenantModel.findOne({ owner: userId });
  }
}


