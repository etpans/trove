import { IsDate, IsString, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateClassDto {
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  name: string;

  @Type(() => Date)
  @IsDate()
  session: Date;
}
