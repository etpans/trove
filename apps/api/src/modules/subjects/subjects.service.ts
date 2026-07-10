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

  async findAll(teacherId: string) {
    return this.subjectsRepo.find({
      where: {
        teacher: {
          id: teacherId,
        },
      },
    });
  }

  async findOne(teacherId: string, id: number) {
    const subject = await this.subjectsRepo.findOne({
      where: { id, teacher: { id: teacherId } },
    });

    return subject;
  }

  async update(teacherId: string, id: number, dto: UpdateSubjectDto) {
    const result = await this.subjectsRepo.update(id, dto);

    if (!result.affected) return null;

    return this.findOne(teacherId, id);
  }

  async remove(teacherId: string, id: number) {
    const subject = await this.findOne(teacherId, id);

    if (!subject) return null;

    await this.subjectsRepo.remove(subject);

    return { deleted: true };
  }
}
