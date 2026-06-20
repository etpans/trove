import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { Subject } from './entities/subject.entity';

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject)
    private readonly subjectsRepo: Repository<Subject>,
  ) {}

  async create(dto: CreateSubjectDto) {
    const subject = this.subjectsRepo.create(dto);
    return this.subjectsRepo.save(subject);
  }

  async findAll() {
    return this.subjectsRepo.find();
  }

  async findOne(id: string) {
    const subject = await this.subjectsRepo.findOne({ where: { id } });

    return subject;
  }

  async update(id: string, dto: UpdateSubjectDto) {
    const result = await this.subjectsRepo.update(id, dto);

    if (!result.affected) return null;

    return this.findOne(id);
  }

  async remove(id: string) {
    const subject = await this.findOne(id);

    if (!subject) return null;

    return { deleted: true };
  }
}
