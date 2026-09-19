import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../auth/user.entity';
import { IsNull, Repository } from 'typeorm';
import { Class } from './entities/class.entity';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { ImportClassesCsvDto } from './dto/import-classes-csv.dto';
import { Student } from '../students/entities/student.entity';

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

const toDateColumnValue = (date: Date) => date.toISOString().slice(0, 10);

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(Class)
    private readonly classRepo: Repository<Class>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
  ) {}

  async create(teacherId: string, createClassDto: CreateClassDto) {
    const teacher = await this.userRepo.findOneBy({ id: teacherId });

    if (!teacher) {
      throw new NotFoundException();
    }

    const classEntity = this.classRepo.create({
      name: createClassDto.name,
      session: toDateColumnValue(createClassDto.session),
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
        deletedAt: IsNull(),
        teacher: {
          id: teacherId,
        },
      },
    });
  }

  async findOne(teacherId: string, id: number) {
    const classEntity = await this.classRepo.findOne({
      where: { id, deletedAt: IsNull(), teacher: { id: teacherId } },
    });
    if (!classEntity) throw new NotFoundException();

    return classEntity;
  }

  async update(teacherId: string, id: number, dto: UpdateClassDto) {
    const classEntity = await this.classRepo.findOne({
      where: {
        id,
        deletedAt: IsNull(),
        teacher: {
          id: teacherId,
        },
      },
    });
    if (!classEntity) throw new NotFoundException();

    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('No fields provided for update');
    }

    const updateData: Partial<Class> = {
      ...dto,
      session: dto.session ? toDateColumnValue(dto.session) : undefined,
    };

    const result = await this.classRepo.update(id, updateData);

    if (!result.affected) return null;

    return this.classRepo.findOne({ where: { id } });
  }

  async remove(teacherId: string, id: number) {
    const classEntity = await this.classRepo.findOne({
      where: { id, deletedAt: IsNull(), teacher: { id: teacherId } },
    });
    if (!classEntity) throw new NotFoundException();

    await this.classRepo.softRemove(classEntity);

    return { deleted: true };
  }

  async importCsv(teacherId: string, dto: ImportClassesCsvDto) {
    const teacher = await this.userRepo.findOneBy({ id: teacherId });
    if (!teacher) {
      throw new NotFoundException();
    }

    const rows = parseCsv(dto.csv);
    if (rows.length < 2) {
      throw new BadRequestException(
        'CSV must include a header and at least one row',
      );
    }

    const headers = rows[0].map((header) => normalizeHeader(header));
    const rowObjects = rows.slice(1);
    const classCache = new Map<string, Class>();
    const errors: Array<{ row: number; message: string }> = [];
    let createdClasses = 0;
    let createdStudents = 0;

    for (const [index, values] of rowObjects.entries()) {
      const rowNumber = index + 2;
      const row = Object.fromEntries(
        headers.map((header, headerIndex) => [
          header,
          values[headerIndex]?.trim() ?? '',
        ]),
      );

      const className = row.classname || row.class || row.name;
      const session = row.session || row.date;
      const color = row.color || undefined;
      const studentName = row.studentname || row.student || '';
      const rollNumber = row.rollnumber || row.roll || undefined;

      if (!className || className.length < 2 || className.length > 30) {
        errors.push({
          row: rowNumber,
          message: 'Class name must be 2-30 characters',
        });
        continue;
      }

      const sessionDate = new Date(session);
      if (!session || Number.isNaN(sessionDate.getTime())) {
        errors.push({
          row: rowNumber,
          message: 'Session must be a valid date',
        });
        continue;
      }

      if (color && !/^#[0-9a-f]{6}$/i.test(color)) {
        errors.push({
          row: rowNumber,
          message: 'Color must be a valid hex color',
        });
        continue;
      }

      if (studentName && studentName.length > 80) {
        errors.push({
          row: rowNumber,
          message: 'Student name must be 80 characters or fewer',
        });
        continue;
      }

      const sessionValue = toDateColumnValue(sessionDate);
      const cacheKey = `${className}:${sessionValue}:${color ?? ''}`;
      let classEntity: Class | null | undefined = classCache.get(cacheKey);

      if (!classEntity) {
        classEntity = await this.classRepo.findOne({
          where: {
            name: className,
            session: sessionValue,
            deletedAt: IsNull(),
            teacher: { id: teacherId },
          },
        });
      }

      if (!classEntity) {
        classEntity = await this.classRepo.save(
          this.classRepo.create({
            name: className,
            session: sessionValue,
            color:
              color ??
              CLASS_COLORS[Math.floor(Math.random() * CLASS_COLORS.length)],
            teacher,
          }),
        );
        createdClasses += 1;
      }

      classCache.set(cacheKey, classEntity);

      if (studentName) {
        await this.studentRepo.save(
          this.studentRepo.create({
            name: studentName,
            rollNumber: rollNumber || undefined,
            classId: classEntity.id,
          }),
        );
        createdStudents += 1;
      }
    }

    return {
      createdClasses,
      createdStudents,
      errors,
    };
  }
}

const normalizeHeader = (header: string) =>
  header.toLowerCase().replace(/[^a-z0-9]/g, '');

const parseCsv = (input: string) => {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(field);
      field = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        i += 1;
      }
      row.push(field);
      if (row.some((value) => value.trim().length > 0)) {
        rows.push(row);
      }
      row = [];
      field = '';
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((value) => value.trim().length > 0)) {
    rows.push(row);
  }

  return rows;
};
