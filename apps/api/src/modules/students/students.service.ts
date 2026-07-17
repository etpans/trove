import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { Student } from './entities/student.entity';
import { Class } from '../classes/entities/class.entity';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectRepository(Class)
    private readonly classRepo: Repository<Class>,
  ) {}

  async create(teacherId: string, createStudentDto: CreateStudentDto) {
    const classEntity = await this.classRepo.findOne({
      where: { id: createStudentDto.classId, teacher: { id: teacherId } },
    });

    if (!classEntity) {
      throw new NotFoundException('Class not found or does not belong to you');
    }

    const student = this.studentRepo.create(createStudentDto);
    return this.studentRepo.save(student);
  }

  async findAll(teacherId: string) {
    return this.studentRepo.find({
      where: {
        class: {
          teacher: {
            id: teacherId,
          },
        },
      },
      relations: {
        class: true,
      },
    });
  }

  async findOne(teacherId: string, id: number) {
    const student = await this.studentRepo.findOne({
      where: {
        id,
        class: {
          teacher: {
            id: teacherId,
          },
        },
      },
      relations: {
        class: true,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  async update(
    teacherId: string,
    id: number,
    updateStudentDto: UpdateStudentDto,
  ) {
    await this.findOne(teacherId, id);

    if (updateStudentDto.classId) {
      const classEntity = await this.classRepo.findOne({
        where: { id: updateStudentDto.classId, teacher: { id: teacherId } },
      });
      if (!classEntity) {
        throw new NotFoundException(
          'Class not found or does not belong to you',
        );
      }
    }

    await this.studentRepo.update(id, updateStudentDto);
    return this.findOne(teacherId, id);
  }

  async remove(teacherId: string, id: number) {
    const student = await this.findOne(teacherId, id);
    await this.studentRepo.remove(student);
    return { deleted: true };
  }
}
