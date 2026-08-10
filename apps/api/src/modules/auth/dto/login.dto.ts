import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase().trim())
  email: string;

  @IsString()
  password: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  'cf-turnstile-response'?: string;
}
