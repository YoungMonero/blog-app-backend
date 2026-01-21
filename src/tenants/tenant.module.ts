// import { Module } from '@nestjs/common';
// import { MongooseModule } from '@nestjs/mongoose';
// import { Tenant, TenantSchema } from './tenant.schema';

// @Module({
//   imports: [
//     MongooseModule.forFeature([{ name: Tenant.name, schema: TenantSchema }]),
//   ],
//   exports: [MongooseModule],
// })
// export class TenantsModule {}

// src/tenants/tenants.module.ts
// import { Module } from '@nestjs/common';
// import { MongooseModule } from '@nestjs/mongoose';
// import { Tenant, TenantSchema } from './tenant.schema';
// import { TenantService } from './tenant.service';

// @Module({
//   imports: [MongooseModule.forFeature([{ name: Tenant.name, schema: TenantSchema }])],
//   providers: [TenanstService],
//   exports: [TenantService],
// })
// export class TenantssModule {}


// src/auth/auth.module.ts
// import { Module } from '@nestjs/common';

// import { MongooseModule } from '@nestjs/mongoose';
// import { User, UserSchema } from '../users/user.schema';
// import { JwtModule } from '@nestjs/jwt';

// @Module({
//   imports: [
//     MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
//     TenantsModule, // ✅ Make sure this is imported
//     JwtModule.register({
//       secret: 'your_jwt_secret', // replace with config
//       signOptions: { expiresIn: '1d' },
//     }),
//   ],
//   providers: [AuthService],
//   controllers: [AuthController],
// })
// export class AuthModule {}


// // src/tenants/tenants.module.ts
// import { Module } from '@nestjs/common';
// import { MongooseModule } from '@nestjs/mongoose';
// import { Tenant, TenantSchema } from './tenant.schema';
// import { TenantService } from './tenant.service'; 
// import { TenantController } from './tenant.controller';


// @Module({
//   imports: [MongooseModule.forFeature([{ name: Tenant.name, schema: TenantSchema }])],
//   providers: [TenantService],
//   controllers: [TenantController], // optional
//   exports: [TenantService], // <-- important to export

// })
// export class TenantModule {}


// src/tenants/tenants.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Tenant, TenantSchema } from './tenant.schema';
import { TenantService } from './tenant.service'; 
import { TenantController } from './tenant.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Tenant.name, schema: TenantSchema }]),
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  providers: [TenantService],
  controllers: [TenantController],
  exports: [TenantService],
})
export class TenantModule {}
