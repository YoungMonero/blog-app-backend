// 

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });
  console.log('MONGO_URI =', process.env.MONGO_URI);


  await app.listen(4000);
}
bootstrap();
