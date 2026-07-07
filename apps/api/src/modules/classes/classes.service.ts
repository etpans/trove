import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../auth/user.entity';
import { Repository } from 'typeorm';
import { Class } from './entities/class.entity';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(Class)
    private readonly classRepo: Repository<Class>,
    private readonly userRepo: Repository<User>,
  ) {}

  async create(teacherId: string, createClassDto: CreateClassDto) {
    const teacher = await this.userRepo.findOneBy({ id: teacherId });

    if (!teacher) {
      throw new NotFoundException();
    }

    const classEntity = this.classRepo.create({
      ...createClassDto,
      teacher,
    });

    return this.classRepo.save(classEntity);
  }

  async findAll(teacherId: string) {
    return this.classRepo.find({
      where: {
        teacher: {
          id: teacherId,
        },
      },
    });
  }

  async findOne(teacherId: string, id: number) {
    const classEntity = await this.classRepo.findOne({
      where: { id, teacher: { id: teacherId } },
    });
    if (!classEntity) throw new NotFoundException();

    return classEntity;
  }

  async update(teacherId: string, id: number, dto: UpdateClassDto) {
    const classEntity = await this.classRepo.findOne({
      where: { teacher: { id: teacherId } },
    });
    if (!classEntity) throw new NotFoundException();

    const result = await this.classRepo.update(id, UpdateClassDto);

    if (!result.affected) return null;

    return this.classRepo.update(id, UpdateClassDto);
  }

  async remove(teacherId: string, id: number) {
    const classEntity = await this.classRepo.findOne({
      where: { id, teacher: { id: teacherId } },
    });
    if (!classEntity) throw new NotFoundException();

    await this.classRepo.remove(classEntity);

    return { deleted: true };
  }
}
