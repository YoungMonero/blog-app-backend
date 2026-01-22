import { IsString, IsNotEmpty } from 'class-validator';

export class CreateBlogDto {
  @IsString()
  @IsNotEmpty()
  title: string;
  
  @IsString()
  description?: string;
}
