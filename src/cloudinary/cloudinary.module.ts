import { Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import { CloudinaryConfigService } from './cloudinary.config';

@Module({
  providers: [CloudinaryConfigService, CloudinaryService],
  exports: [CloudinaryService], // Only export service
})
export class CloudinaryModule {}
