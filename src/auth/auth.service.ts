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
    // Email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.com$/i;
    
    if (!emailRegex.test(dto.email)) {
      throw new BadRequestException('Email address should include @ and end with .com (e.g., user@example.com)');
    }

    // Check for existing email and username
    const [existingEmail, existingUsername] = await Promise.all([
      this.userModel.findOne({ email: dto.email }),
      this.userModel.findOne({ username: dto.username }),
    ]);

    if (existingEmail) throw new ConflictException('Email already in use');
    if (existingUsername) throw new ConflictException('Username already taken');

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create user
    const user = new this.userModel({
      email: dto.email,
      username: dto.username,
      passwordHash,
      role: 'author',
    });
    
    await user.save();

    // Generate unique tenant slug
    const tenantName = dto.username;
    const baseSlug = slugify(tenantName, { lower: true, strict: true });
    let tenantSlug = baseSlug;
    let counter = 1;

    // Check if slug already exists and generate unique one
    while (await this.tenantModel.findOne({ slug: tenantSlug })) {
      tenantSlug = `${baseSlug}-${counter}`;
      counter++;

      // Safety limit
      if (counter > 100) {
        tenantSlug = `${baseSlug}-${Date.now()}`;
        break;
      }
    }

    try {
      // Create tenant with unique slug
      const tenant = new this.tenantModel({
        owner: user._id.toString(),
        userId: user._id.toString(),
        name: tenantName,
        slug: tenantSlug, // Use the generated unique slug
      });
      
      await tenant.save();

      // Update user with tenant ID
      user.tenantId = tenant._id.toString();
      await user.save();

      // Create JWT token
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
      
    } catch (error) {
      // Clean up user if tenant creation fails
      await this.userModel.deleteOne({ _id: user._id });
      
      // Handle duplicate error
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0];
        const messages = {
          slug: 'Profile URL conflict. Please try a different username or contact support.',
          owner: 'User already has a blog profile.',
          userId: 'User already has a blog profile.',
        };
        
        throw new ConflictException(
          messages[field] || 'Registration conflict. Please try different information.'
        );
      }
      
      // Re-throw other errors
      throw new BadRequestException(
        `Registration failed: ${error.message || 'Please try again.'}`
      );
    }
  }

  async login(dto: LoginDto) {
    const user = await this.userModel.findOne({ email: dto.email });
    if (!user) throw new BadRequestException('Account does not exist');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new BadRequestException('Invalid email or password. Please try again.');

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