import { 
  IsString, 
  IsNotEmpty, 
  IsOptional, 
  IsEnum, 
  IsUrl, 
  MinLength, 
  MaxLength, 
  IsArray 
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsString()
  @IsOptional()
  @Transform(({ value, obj }) => {
    // Auto-generate slug from title if not provided
    if (!value && obj.title) {
      return obj.title
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
    }
    return value?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  })
  slug?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  content: string;

  // --- CHANGED SECTION START ---
  
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    return value;
  })
  @IsUrl({ require_protocol: true }, { 
    message: 'Thumbnail must be a valid URL' 
  })
  thumbnail?: string;

  // @IsOptional()
  // @IsString()
  // @MinLength(10, { message: 'Excerpt must be at least 10 characters long' })
  // @MaxLength(500)
  // excerpt?: string;

  @IsOptional()
@Transform(({ value }) =>
  typeof value === 'string' && value.trim().length === 0
    ? undefined
    : value
)
@IsString()
@MinLength(10)
@MaxLength(500)
excerpt?: string;


  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  authorId?: string; 

  @IsOptional()
  @IsString()
  @MinLength(20)
  @MaxLength(160)
  seoDescription?: string;

  @IsOptional()
  @IsEnum(['draft', 'published'])
  status?: 'draft' | 'published' = 'published';
}