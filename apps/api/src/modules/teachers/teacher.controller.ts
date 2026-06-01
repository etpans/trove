import { Controller } from '@nestjs/common';
import { TeachersService } from './teacher.service';
import { Teacher } from './teacher.entity';
import { BaseController } from '../common/base.controller';

@Controller('teachers')
export class TeachersController extends BaseController<Teacher> {
  constructor(protected readonly service: TeachersService) {
    super(service);
  }
}
