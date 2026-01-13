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
    @InjectModel(Tenant.name) private tenantModel: Model<Tenant>,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.userModel.findOne({ email: dto.email });
    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

    const tenant = await this.tenantModel.create({
      name: dto.userName,
 
    });

    const passwordHash = await bcrypt.hash(dto.password, 10);

 
    await this.userModel.create({
  email: dto.email,
  passwordHash,
  tenantId: tenant._id.toString(),
});


    return { message: 'Registration successful' };
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

    return {
      accessToken: this.jwtService.sign({
        sub: user._id,
        tenantId: user.tenantId,
      }),
    };
  }
}
