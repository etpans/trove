import { PartialType } from '@nestjs/mapped-types';
import { CreateSubjectDto } from './create-subject.dto';
import { IsString, MinLength, MaxLength, IsHexColor } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateSubjectDto extends PartialType(CreateSubjectDto) {
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  @Transform(({ value }) => value.trim())
  name?: string;

  @IsHexColor({ message: 'color must be valid hex color' })
  color?: string;
}
