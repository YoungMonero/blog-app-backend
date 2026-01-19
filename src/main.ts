// 

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger()

  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });
  const port = process.env.PORT || 4000
  console.log('MONGO_URI =', process.env.MONGO_URI);
  await app.listen(port);
  logger.log(`server is listening on port${port}`)
  
}
bootstrap();
