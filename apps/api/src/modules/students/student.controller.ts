import { Controller } from '@nestjs/common';
import { StudentsService } from './student.service';
import { Student } from './student.entity';
import { BaseController } from '../common/base.controller';

@Controller('students')
export class StudentsController extends BaseController<Student> {
  constructor(private readonly service: StudentsService) {
    super(service);
  }
}
