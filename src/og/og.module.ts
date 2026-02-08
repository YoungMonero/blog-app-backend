import { Module } from '@nestjs/common';
import { OgController } from './og.controller';
import { OgService } from './og.service';
import { OgImageService } from './og-image/og-image.service';

@Module({
  controllers: [OgController],
  providers: [OgService, OgImageService]
})
export class OgModule {}
