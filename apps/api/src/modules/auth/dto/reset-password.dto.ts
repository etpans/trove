import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class ResetPasswordDto {
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase().trim())
  email: string;

  @IsString()
  @Matches(/^\d{6}$/)
  code: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
}
