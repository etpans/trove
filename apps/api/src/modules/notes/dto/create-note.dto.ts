import {
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  content: string;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  studentId: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  subjectId?: number | null;

  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayUnique()
  @IsOptional()
  @Type(() => Number)
  tagIds?: number[];
}
