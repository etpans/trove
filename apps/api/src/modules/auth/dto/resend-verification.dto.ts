import { IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';

export class ResendVerificationDto {
  @IsEmail()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  email: string;
}
