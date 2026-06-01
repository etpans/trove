import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject } from './subject.entity';
import { BaseService } from '../common/base.service';

@Injectable()
export class SubjectsService extends BaseService<Subject> {
  constructor(
    @InjectRepository(Subject)
    repo: Repository<Subject>,
  ) {
    super(repo);
  }
}
