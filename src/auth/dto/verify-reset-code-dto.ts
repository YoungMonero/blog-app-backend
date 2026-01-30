import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyResetCodeDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please enter a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    description: '6-digit reset code',
    example: '123456',
  })
  @IsString({ message: 'Reset code must be a string' })
  @IsNotEmpty({ message: 'Reset code is required' })
  @Length(6, 6, { message: 'Reset code must be exactly 6 digits' })
  resetCode: string;
}