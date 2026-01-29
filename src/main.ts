// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';
// import { Logger, ValidationPipe } from '@nestjs/common';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);
//   const logger = new Logger();

//   app.enableCors({
//     origin: 'http://localhost:3000',
//     credentials: true,
//   });

//   app.useGlobalPipes(
//     new ValidationPipe({
//       whitelist: true,
//       forbidNonWhitelisted: true,
//       transform: true,
//     }),
//   );

//   const port = process.env.PORT || 4000;
//   console.log('MONGO_URI =', process.env.MONGO_URI);

//   await app.listen(port);
//   logger.log(`Server is listening on port ${port}`);
// }
// bootstrap();


// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';
// import { Logger, ValidationPipe } from '@nestjs/common';

// async function bootstrap() {
//   try {
//     const app = await NestFactory.create(AppModule);
//     const logger = new Logger();

//     app.enableCors({
//       origin: 'http://localhost:3000',
//       credentials: true,
//     });

//     app.useGlobalPipes(
//       new ValidationPipe({
//         whitelist: true,
//         forbidNonWhitelisted: true,
//         transform: true,
//       }),
//     );

//     const port = process.env.PORT || 4000;
//     console.log('MONGO_URI =', process.env.MONGO_URI);

//     await app.listen(port);
//     logger.log(`Server is listening on port ${port}`);
//   } catch (error) {
//     console.error('Error starting server:', error);
//     process.exit(1);
//   }
// }
// bootstrap();


import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  try {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    const logger = new Logger();

    // Enable CORS
    app.enableCors({
      origin: 'http://localhost:3000',
      credentials: true,
    });

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // ✅ Serve uploads folder statically at /uploads
    app.useStaticAssets(join(__dirname, '..', 'uploads'), {
      prefix: '/uploads/',
    });

    const port = process.env.PORT || 4000;
    console.log('MONGO_URI =', process.env.MONGO_URI);

    await app.listen(port);
    logger.log(`Server is listening on port ${port}`);
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}
bootstrap();
