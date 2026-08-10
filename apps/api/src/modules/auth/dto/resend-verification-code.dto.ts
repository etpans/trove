import { IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';

export class ResendVerificationCodeDto {
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase().trim())
  email: string;
}
