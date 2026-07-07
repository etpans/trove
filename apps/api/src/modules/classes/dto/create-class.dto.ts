import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateClassDto {
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  name: string;
}
