import { IsString, MinLength, MaxLength, IsHexColor } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateSubjectDto {
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  @Transform(({ value }) => value.trim())
  name: string;

  @IsHexColor({ message: 'color must be valid hex color' })
  color: string;
}
