import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../auth/user.entity';
import { Repository } from 'typeorm';
import { Class } from './entities/class.entity';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';

const CLASS_COLORS = [
  '#2563EB',
  '#059669',
  '#D97706',
  '#DC2626',
  '#7C3AED',
  '#0891B2',
  '#DB2777',
  '#4F46E5',
];

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(Class)
    private readonly classRepo: Repository<Class>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async create(teacherId: string, createClassDto: CreateClassDto) {
    const teacher = await this.userRepo.findOneBy({ id: teacherId });

    if (!teacher) {
      throw new NotFoundException();
    }

    const classEntity = this.classRepo.create({
      ...createClassDto,
      color:
        createClassDto.color ??
        CLASS_COLORS[Math.floor(Math.random() * CLASS_COLORS.length)],
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
      where: {
        id,
        teacher: {
          id: teacherId,
        },
      },
    });
    if (!classEntity) throw new NotFoundException();

    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('No fields provided for update');
    }

    const result = await this.classRepo.update(id, dto);

    if (!result.affected) return null;

    return this.classRepo.findOne({ where: { id } });
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
