// import { IsEmail, IsString } from 'class-validator';

// export class LoginDto {
//   @IsEmail()
//   email: string;

//   @IsString()
//   password: string;
// }


import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
