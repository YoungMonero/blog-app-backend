import { PartialType } from '@nestjs/mapped-types';
import { CreatePostDto } from './create-post.dto';
import { IsOptional, IsBoolean, IsString } from 'class-validator';

export class UpdatePostDto extends PartialType(CreatePostDto) {
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  /**
   * We explicitly add validation here to ensure that if a publicId 
   * is sent during an update, it must be a valid string.
   */
  @IsOptional()
  @IsString()
  thumbnailPublicId?: string;
}