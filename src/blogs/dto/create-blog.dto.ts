import { IsString, IsNotEmpty } from 'class-validator';

export class CreateBlogDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  description?: string;
}
