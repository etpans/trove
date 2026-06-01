import { Controller } from '@nestjs/common';
import { Subject } from './subject.entity';
import { SubjectsService } from './subjects.service';
import { BaseController } from '../common/base.controller';

@Controller('academics/subjects')
export class SubjectsController extends BaseController<Subject> {
  constructor(protected readonly service: SubjectsService) {
    super(service);
  }
}
