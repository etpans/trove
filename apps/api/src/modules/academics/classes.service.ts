import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassEntity } from './class.entity';
import { BaseService } from '../common/base.service';

@Injectable()
export class ClassesService extends BaseService<ClassEntity> {
  constructor(
    @InjectRepository(ClassEntity)
    repo: Repository<ClassEntity>,
  ) {
    super(repo);
  }
}
