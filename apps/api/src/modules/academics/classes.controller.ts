import { Controller } from '@nestjs/common';
import { ClassEntity } from './class.entity';
import { ClassesService } from './classes.service';
import { BaseController } from '../common/base.controller';

@Controller('academics/classes')
export class ClassesController extends BaseController<ClassEntity> {
  constructor(protected readonly service: ClassesService) {
    super(service);
  }
}
