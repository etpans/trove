import { IsInt } from 'class-validator';

export class EnrollStudentDto {
  @IsInt()
  studentId: number;
}
