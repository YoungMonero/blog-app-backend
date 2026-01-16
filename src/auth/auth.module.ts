

// import { Module } from '@nestjs/common';
// import { JwtModule } from '@nestjs/jwt';
// import { PassportModule } from '@nestjs/passport';
// import { MongooseModule } from '@nestjs/mongoose';
// import { ConfigModule, ConfigService } from '@nestjs/config';

// import { AuthService } from './auth.service';
// import { AuthController } from './auth.controller';
// import { User, UserSchema } from '../users/user.schema';
// import { Tenant, TenantSchema } from '../tenants/tenant.schema';

// @Module({
//   imports: [
//     ConfigModule,
//     PassportModule,
//     JwtModule.registerAsync({
//       imports: [ConfigModule],
//       inject: [ConfigService],
//       useFactory: (configService: ConfigService) => ({
//         secret: configService.get<string>('JWT_SECRET'),
//         signOptions: { expiresIn: '7d' },
//       }),
//     }),
//     MongooseModule.forFeature([
//       { name: User.name, schema: UserSchema },
//       { name: Tenant.name, schema: TenantSchema },
//     ]),
//   ],
//   controllers: [AuthController],
//   providers: [AuthService],
// })
// export class AuthModule {}





// // src/auth/auth.module.ts
// import { Module } from '@nestjs/common';
// import { JwtModule } from '@nestjs/jwt';
// import { PassportModule } from '@nestjs/passport';
// import { MongooseModule } from '@nestjs/mongoose';
// import { ConfigModule, ConfigService } from '@nestjs/config';

// import { AuthService } from './auth.service';
// import { AuthController } from './auth.controller';
// import { User, UserSchema } from '../users/user.schema';
// import { Tenant, TenantSchema } from '../tenants/tenant.schema';
// import { TenantModule } from '../tenants/tenant.module'; // 👈 import here

// @Module({
//   imports: [
//     ConfigModule,
//     PassportModule,
//     JwtModule.registerAsync({
//       imports: [ConfigModule],
//       inject: [ConfigService],
//       useFactory: (configService: ConfigService) => ({
//         secret: configService.get<string>('JWT_SECRET'),
//         signOptions: { expiresIn: '7d' },
//       }),
//     }),
//     MongooseModule.forFeature([
//       { name: User.name, schema: UserSchema },
//       { name: Tenant.name, schema: TenantSchema },
//     ]),
//     TenantModule, // 👈 add this
//   ],
//   controllers: [AuthController],
//   providers: [AuthService],
// })
// export class AuthModule {}



// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User, UserSchema } from '../users/user.schema';
import { Tenant, TenantSchema } from '../tenants/tenant.schema';
import { TenantModule } from '../tenants/tenant.module';
import { JwtAuthGuard } from './jwt-auth.guard'; // 👈 add guard here if you want to provide it

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'defaultSecret',
        signOptions: { expiresIn: '7d' },
      }),
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
    TenantModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard], // 👈 provide guard here
  exports: [JwtModule, AuthService, JwtAuthGuard], // 👈 export so BlogsModule can use them
})
export class AuthModule {}
