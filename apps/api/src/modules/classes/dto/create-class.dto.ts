import { IsDate, IsString, MinLength, MaxLength } from 'class-validator';
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
}
