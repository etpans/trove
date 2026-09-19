import { IsString, MaxLength, MinLength } from 'class-validator';

export class ImportClassesCsvDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200_000)
  csv: string;
}
