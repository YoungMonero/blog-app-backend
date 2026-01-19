// // 
// import { Module } from '@nestjs/common';
// import { ConfigModule, ConfigService } from '@nestjs/config';
// import { MongooseModule } from '@nestjs/mongoose';
// import { AuthModule } from './auth/auth.module';

// import { TenantModule } from './tenants/tenant.module';


// @Module({
//   imports: [
//     ConfigModule.forRoot({ isGlobal: true }),

//     MongooseModule.forRootAsync({
//       inject: [ConfigService],
//       useFactory: (config: ConfigService) => ({
//         uri: config.get<string>('MONGO_URI'),
//       }),
//     }),

//     AuthModule,
//     TenantModule,
//   ],
// })
// export class AppModule {}


import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from './auth/auth.module';
import { TenantModule } from './tenants/tenant.module';
import { BlogsModule } from './blogs/blogs.module';
import { PostController } from './post/post.controller';
import { PostModule } from './post/post.module';

@Module({
  imports: [

    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGO_URI'),
      }),
    }),

    AuthModule,
    TenantModule,
    BlogsModule,
    PostModule,
  ],
  controllers: [PostController],
})
export class AppModule {}
