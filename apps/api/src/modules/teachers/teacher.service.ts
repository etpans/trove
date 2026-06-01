import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Teacher } from './teacher.entity';
import { BaseService } from '../common/base.service';

@Injectable()
export class TeachersService extends BaseService<Teacher> {
  constructor(
    @InjectRepository(Teacher)
    repo: Repository<Teacher>,
  ) {
    super(repo);
  }
}
