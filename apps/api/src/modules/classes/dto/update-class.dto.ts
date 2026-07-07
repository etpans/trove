import { IsString, MinLength, MaxLength } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateClassDto } from './create-class.dto';

export class UpdateClassDto extends PartialType(CreateClassDto) {
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  name: string;
}
