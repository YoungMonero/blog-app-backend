// // auth/auth.service.ts
// import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
// import { JwtService } from '@nestjs/jwt';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model } from 'mongoose';
// import * as bcrypt from 'bcrypt';

// import { User } from '../users/user.schema';
// import { Tenant } from '../tenants/tenant.schema';
// import { RegisterDto } from './dto/register.dto';
// import { LoginDto } from './dto/login.dto';

// @Injectable()
// export class AuthService {
//   constructor(
//     @InjectModel(User.name) private userModel: Model<User>,
//     @InjectModel(Tenant.name) private tenantModel: Model<Tenant>,
//     private jwtService: JwtService,
//   ) {}

//   async register(dto: RegisterDto) {
//     // Check for existing email/username
//     const [existingEmail, existingUsername] = await Promise.all([
//       this.userModel.findOne({ email: dto.email }),
//       this.userModel.findOne({ username: dto.username }),
//     ]);

//     if (existingEmail) throw new ConflictException('Email already in use');
//     if (existingUsername) throw new ConflictException('Username already taken');

//     const passwordHash = await bcrypt.hash(dto.password, 10);

//     // Create user as READER (no blog)
//     const user = new this.userModel({
//       email: dto.email,
//       username: dto.username,
//       passwordHash,
//       role: 'reader', // Default role
//       // NO tenantId
//     });

//     await user.save();

//     // Generate token WITHOUT tenantId
//     const token = this.jwtService.sign({
//       sub: user._id.toString(),
//       userId: user._id.toString(),
//       email: user.email,
//       username: user.username,
//       role: 'reader',
//       hasBlog: false, // Important!
//     });

//     return {
//       message: 'Welcome! Start exploring blogs or create your own when ready.',
//       accessToken: token,
//       user: {
//         id: user._id,
//         email: user.email,
//         username: user.username,
//         role: 'reader',
//         hasBlog: false,
//       }
//     };
//   }

//   async login(dto: LoginDto) {
//     const user = await this.userModel.findOne({ email: dto.email });
//     if (!user) throw new BadRequestException('Invalid credentials');

//     const valid = await bcrypt.compare(dto.password, user.passwordHash);
//     if (!valid) throw new BadRequestException('Invalid credentials');

//     // Check if user has a blog
//     const tenant = await this.tenantModel.findOne({
//       $or: [{ owner: user._id.toString() }, { userId: user._id.toString() }]
//     });

//     const hasBlog = !!tenant;
//     const role = hasBlog ? 'author' : 'reader';

//     // Update user role if inconsistent
//     if (user.role !== role) {
//       user.role = role;
//       await user.save();
//     }

//     const tokenPayload: any = {
//       sub: user._id.toString(),
//       userId: user._id.toString(),
//       email: user.email,
//       username: user.username,
//       role,
//       hasBlog,
//     };

//     if (hasBlog && tenant) {
//       tokenPayload.tenantId = tenant._id.toString();
//     }

//     const token = this.jwtService.sign(tokenPayload);

//     return {
//       accessToken: token,
//       user: {
//         id: user._id,
//         email: user.email,
//         username: user.username,
//         role,
//         hasBlog,
//         tenantId: tenant?._id,
//       }
//     };
//   }

//   // Helper to upgrade reader to author
//   async upgradeToAuthor(userId: string, tenantId: string) {
//     const user = await this.userModel.findById(userId);
//     if (!user) throw new BadRequestException('User not found');

//     user.role = 'author';
//     user.tenantId = tenantId;
//     await user.save();

//     return this.jwtService.sign({
//       sub: user._id.toString(),
//       userId: user._id.toString(),
//       email: user.email,
//       username: user.username,
//       role: 'author',
//       hasBlog: true,
//       tenantId,
//     });
//   }
// }




// // auth/auth.service.ts
// import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
// import { JwtService } from '@nestjs/jwt';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model } from 'mongoose';
// import * as bcrypt from 'bcrypt';

// import { User } from '../users/user.schema';
// import { Tenant } from '../tenants/tenant.schema';
// import { RegisterDto } from './dto/register.dto';
// import { LoginDto } from './dto/login.dto';

// @Injectable()
// export class AuthService {
//   constructor(
//     @InjectModel(User.name) private userModel: Model<User>,
//     @InjectModel(Tenant.name) private tenantModel: Model<Tenant>,
//     private jwtService: JwtService,
//   ) {}

//   async register(dto: RegisterDto) {
//     // Check for existing email/username
//     const [existingEmail, existingUsername] = await Promise.all([
//       this.userModel.findOne({ email: dto.email }),
//       this.userModel.findOne({ username: dto.username }),
//     ]);

//     if (existingEmail) throw new ConflictException('Email already in use');
//     if (existingUsername) throw new ConflictException('Username already taken');

//     const passwordHash = await bcrypt.hash(dto.password, 10);

//     // Create user
//     const user = new this.userModel({
//       email: dto.email,
//       username: dto.username,
//       passwordHash,
//       role: 'author', // 👈 full rights immediately
//     });
//     await user.save();

//     // Create tenant for this user
//     const tenant = new this.tenantModel({
//       owner: user._id.toString(),
//       slug: dto.username, // 👈 or generate slug properly
//     });
//     await tenant.save();

//     // Attach tenantId to user
//     user.tenantId = tenant._id.toString();
//     await user.save();

//     // Generate token WITH tenantId
//     const token = this.jwtService.sign({
//       sub: user._id.toString(),
//       userId: user._id.toString(),
//       email: user.email,
//       username: user.username,
//       role: 'author',
//       hasBlog: true,
//       tenantId: tenant._id.toString(), // 👈 critical
//     });

//     return {
//       message: 'Welcome! Your blog tenant has been created.',
//       accessToken: token,
//       user: {
//         id: user._id,
//         email: user.email,
//         username: user.username,
//         role: 'author',
//         hasBlog: true,
//         tenantId: tenant._id,
//       },
//     };
//   }

//   async login(dto: LoginDto) {
//     const user = await this.userModel.findOne({ email: dto.email });
//     if (!user) throw new BadRequestException('Invalid credentials');

//     const valid = await bcrypt.compare(dto.password, user.passwordHash);
//     if (!valid) throw new BadRequestException('Invalid credentials');

//     // Check if user has a blog
//     const tenant = await this.tenantModel.findOne({
//       $or: [{ owner: user._id.toString() }, { userId: user._id.toString() }],
//     });

//     const hasBlog = !!tenant;
//     const role = hasBlog ? 'author' : 'reader';

//     // Update user role if inconsistent
//     if (user.role !== role) {
//       user.role = role;
//       await user.save();
//     }

//     // Always include tenantId if user has one
//     const tokenPayload: any = {
//       sub: user._id.toString(),
//       userId: user._id.toString(),
//       email: user.email,
//       username: user.username,
//       role,
//       hasBlog,
//       tenantId: user.tenantId || tenant?._id?.toString(),
//     };

//     const token = this.jwtService.sign(tokenPayload);

//     return {
//       accessToken: token,
//       user: {
//         id: user._id,
//         email: user.email,
//         username: user.username,
//         role,
//         hasBlog,
//         tenantId: user.tenantId || tenant?._id,
//       },
//     };
//   }

//   // Helper to upgrade reader to author
//   async upgradeToAuthor(userId: string, tenantId: string) {
//     const user = await this.userModel.findById(userId);
//     if (!user) throw new BadRequestException('User not found');

//     user.role = 'author';
//     user.tenantId = tenantId;
//     await user.save();

//     return this.jwtService.sign({
//       sub: user._id.toString(),
//       userId: user._id.toString(),
//       email: user.email,
//       username: user.username,
//       role: 'author',
//       hasBlog: true,
//       tenantId,
//     });
//   }
// }



// src/auth/auth.service.ts
import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
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
    @InjectModel(Tenant.name) private tenantModel: Model<Tenant>,
    private jwtService: JwtService,
  ) {}

  // ✅ Register new user + tenant
  async register(dto: RegisterDto) {
    // Check for existing email/username
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

    // Create tenant (all required fields)
    const tenant = new this.tenantModel({
      owner: user._id.toString(),
      userId: user._id.toString(),
      name: dto.username, // 👈 required
      slug: dto.username, // 👈 required
    });
    await tenant.save();

    // Attach tenantId to user
    user.tenantId = tenant._id.toString();
    await user.save();

    // Generate token WITH tenantId
    const token = this.jwtService.sign({
      sub: user._id.toString(),
      userId: user._id.toString(),
      email: user.email,
      username: user.username,
      role: 'author',
      hasBlog: true,
      tenantId: tenant._id.toString(),
    });

    return {
      message: 'Welcome! Your blog tenant has been created.',
      accessToken: token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: 'author',
        hasBlog: true,
        tenantId: tenant._id,
      },
    };
  }

  // ✅ Login existing user
  async login(dto: LoginDto) {
    const user = await this.userModel.findOne({ email: dto.email });
    if (!user) throw new BadRequestException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new BadRequestException('Invalid credentials');

    // Find tenant
    let tenant = await this.tenantModel.findOne({
      $or: [{ owner: user._id.toString() }, { userId: user._id.toString() }],
    });

    // If tenant missing, auto-create one
    if (!tenant) {
      tenant = new this.tenantModel({
        owner: user._id.toString(),
        userId: user._id.toString(),
        name: user.username,
        slug: user.username,
      });
      await tenant.save();

      user.tenantId = tenant._id.toString();
      user.role = 'author';
      await user.save();
    }

    const hasBlog = true;
    const role = 'author';

    const tokenPayload: any = {
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
        email: user.email,
        username: user.username,
        role,
        hasBlog,
        tenantId: user.tenantId || tenant._id,
      },
    };
  }

  // ✅ Upgrade reader to author
  async upgradeToAuthor(userId: string, tenantId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new BadRequestException('User not found');

    user.role = 'author';
    user.tenantId = tenantId;
    await user.save();

    return this.jwtService.sign({
      sub: user._id.toString(),
      userId: user._id.toString(),
      email: user.email,
      username: user.username,
      role: 'author',
      hasBlog: true,
      tenantId,
    });
  }
}
