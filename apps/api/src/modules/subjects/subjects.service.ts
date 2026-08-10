import { Injectable, NotFoundException } from '@nestjs/common';
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

  async create(teacherId: string, dto: CreateSubjectDto) {
    const subject = this.subjectsRepo.create({
      ...dto,
      teacherId,
    });
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

    if (!subject) throw new NotFoundException('Subject not found');

    return subject;
  }

  async update(teacherId: string, id: number, dto: UpdateSubjectDto) {
    const subject = await this.findOne(teacherId, id);

    Object.assign(subject, dto);
    return this.subjectsRepo.save(subject);
  }

  async remove(teacherId: string, id: number) {
    const subject = await this.findOne(teacherId, id);

    await this.subjectsRepo.remove(subject);

    return { deleted: true };
  }
}
