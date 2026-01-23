

import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import slugify from 'slugify';

import { User } from '../users/user.schema';
import { Tenant } from '../tenants/tenant.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Tenant.name) private tenantModel: Model<Tenant>,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const [existingEmail, existingUsername] = await Promise.all([
      this.userModel.findOne({ email: dto.email }),
      this.userModel.findOne({ username: dto.username }),
    ]);

    if (existingEmail) throw new ConflictException('Email already in use');
    if (existingUsername) throw new ConflictException('Username already taken');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create user
    const user = new this.userModel({
      email: dto.email,
      username: dto.username,
      passwordHash,
      role: 'author',
    });
    await user.save();

    // Create tenant (safe slug)
    const tenantName = dto.username;
    const tenantSlug = slugify(tenantName, { lower: true, strict: true });

    const tenant = new this.tenantModel({
      owner: user._id.toString(),
      userId: user._id.toString(),
      name: tenantName,
      slug: tenantSlug,
    });
    await tenant.save();

    user.tenantId = tenant._id.toString();
    await user.save();

    const tokenPayload = {
      sub: user._id.toString(),
      userId: user._id.toString(),
      email: user.email,
      username: user.username,
      role: 'author',
      hasBlog: true,
      tenantId: tenant._id.toString(),
    };

    const token = this.jwtService.sign(tokenPayload);

    return {
      message: 'Welcome! Your blog tenant has been created.',
      accessToken: token,
      user: {
        id: user._id,
        userId: user._id.toString(),
        email: user.email,
        username: user.username,
        role: 'author',
        hasBlog: true,
        tenantId: tenant._id,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userModel.findOne({ email: dto.email });
    if (!user) throw new BadRequestException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new BadRequestException('Invalid credentials');

    // Find tenant
    let tenant = await this.tenantModel.findOne({
      $or: [{ owner: user._id.toString() }, { userId: user._id.toString() }],
    });

    // If tenant missing, auto-create one with safe fallback
    if (!tenant) {
      const tenantName = user.username || user.email.split('@')[0];
      const tenantSlug = slugify(tenantName, { lower: true, strict: true });

      tenant = new this.tenantModel({
        owner: user._id.toString(),
        userId: user._id.toString(),
        name: tenantName,
        slug: tenantSlug,
      });
      await tenant.save();

      user.tenantId = tenant._id.toString();
      user.role = 'author';
      await user.save();
    }

    const hasBlog = true;
    const role = 'author';

    const tokenPayload = {
      sub: user._id.toString(),
      userId: user._id.toString(),
      email: user.email,
      username: user.username,
      role,
      hasBlog,
      tenantId: user.tenantId || tenant._id.toString(),
    };

    const token = this.jwtService.sign(tokenPayload);

    return {
      accessToken: token,
      user: {
        id: user._id,
        userId: user._id.toString(),
        email: user.email,
        username: user.username,
        role,
        hasBlog,
        tenantId: user.tenantId || tenant._id,
      },
    };
  }

  async upgradeToAuthor(userId: string, tenantId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new BadRequestException('User not found');

    user.role = 'author';
    user.tenantId = tenantId;
    await user.save();

    const tokenPayload = {
      sub: user._id.toString(),
      userId: user._id.toString(),
      email: user.email,
      username: user.username,
      role: 'author',
      hasBlog: true,
      tenantId,
    };

    return this.jwtService.sign(tokenPayload);
  }
}
