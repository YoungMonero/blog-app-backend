import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';

import { User } from '../users/user.schema';
import { Tenant } from '../tenants/tenant.schema'; 
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Tenant.name) private tenantModel: Model<Tenant>, // This exists
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.userModel.findOne({ email: dto.email });
    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = new this.userModel({
      email: dto.email,
      username: dto.username,
      passwordHash
    });

    await user.save();

    const tenantSlug = dto.username.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/--+/g, '-');
    
    const tenant = new this.tenantModel({
      name: `${dto.username}'s Blog`,
      slug: tenantSlug,
      owner: user._id.toString(),  
      userId: user._id.toString(),
    });

    await tenant.save();

  
    user.tenantId = tenant._id.toString();
    await user.save();


    const token = this.jwtService.sign({
      sub: user._id.toString(),
      userId: user._id.toString(),
      tenantId: tenant._id.toString(),
      email: user.email,
    });

    return {
      message: 'Registration successful',
      accessToken: token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        tenantId: tenant._id,
      }
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userModel.findOne({ email: dto.email });
    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new BadRequestException('Invalid credentials');
    }

  
    let tenant = await this.tenantModel.findOne({ 
      $or: [
        { owner: user._id.toString() },
        { userId: user._id.toString() }
      ]
    });

    if (!tenant) {
      const tenantSlug = (user.username || user.email.split('@')[0])
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/--+/g, '-');
      
      tenant = new this.tenantModel({
        name: `${user.username || 'My'}'s Blog`,
        slug: tenantSlug,
        owner: user._id.toString(),
        userId: user._id.toString(),
      });
      await tenant.save();
      

      user.tenantId = tenant._id.toString();
      await user.save();
    }

    const token = this.jwtService.sign({
      sub: user._id.toString(),
      userId: user._id.toString(),
      tenantId: tenant._id.toString(), 
      email: user.email,
    });

    return {
      accessToken: token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        tenantId: tenant._id,
      }
    };
  }
}