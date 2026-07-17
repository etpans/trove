import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateStudentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  rollNumber?: string;

  @IsNumber()
  @IsNotEmpty()
  classId: number;
}
