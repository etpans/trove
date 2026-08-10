import {
  IsDate,
  IsHexColor,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateClassDto {
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @Type(() => Date)
  @IsDate()
  session: Date;

  @IsHexColor({ message: 'color must be valid hex color' })
  @IsOptional()
  color?: string;
}
