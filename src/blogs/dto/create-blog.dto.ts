// import { IsString, IsNotEmpty } from 'class-validator';

// export class CreateBlogDto {
//   @IsString()
//   @IsNotEmpty()
//   title: string;

//   description?: string;
// }


import { IsString, IsNotEmpty } from 'class-validator';

export class CreateBlogDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;
}
