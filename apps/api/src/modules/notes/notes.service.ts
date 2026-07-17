import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { Note } from './entities/note.entity';
import { Student } from '../students/entities/student.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { Tag } from '../tags/entities/tag.entity';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note)
    private readonly noteRepo: Repository<Note>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectRepository(Subject)
    private readonly subjectRepo: Repository<Subject>,
    @InjectRepository(Tag)
    private readonly tagRepo: Repository<Tag>,
  ) {}

  async create(teacherId: string, createNoteDto: CreateNoteDto) {
    // Verify the student belongs to a class taught by the teacher
    const student = await this.studentRepo.findOne({
      where: {
        id: createNoteDto.studentId,
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
      throw new NotFoundException(
        'Student not found or does not belong to you',
      );
    }

    // Verify subject if provided
    if (createNoteDto.subjectId) {
      const subject = await this.subjectRepo.findOne({
        where: {
          id: createNoteDto.subjectId,
          teacher: {
            id: teacherId,
          },
        },
      });
      if (!subject) {
        throw new NotFoundException(
          'Subject not found or does not belong to you',
        );
      }
    }

    // Verify tags if provided
    let tags: Tag[] = [];
    if (createNoteDto.tagIds && createNoteDto.tagIds.length > 0) {
      tags = await this.tagRepo.find({
        where: {
          id: In(createNoteDto.tagIds),
          teacher: {
            id: teacherId,
          },
        },
      });
      if (tags.length !== createNoteDto.tagIds.length) {
        throw new NotFoundException(
          'One or more tags not found or do not belong to you',
        );
      }
    }

    const { tagIds, ...noteData } = createNoteDto;

    const note = this.noteRepo.create({
      ...noteData,
      teacherId,
      tags,
    });

    return this.noteRepo.save(note);
  }

  async findAll(teacherId: string) {
    return this.noteRepo.find({
      where: {
        teacherId,
      },
      relations: {
        student: true,
        subject: true,
        tags: true,
      },
    });
  }

  async findOne(teacherId: string, id: number) {
    const note = await this.noteRepo.findOne({
      where: {
        id,
        teacherId,
      },
      relations: {
        student: true,
        subject: true,
        tags: true,
      },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    return note;
  }

  async update(teacherId: string, id: number, updateNoteDto: UpdateNoteDto) {
    const note = await this.findOne(teacherId, id);

    if (updateNoteDto.studentId) {
      const student = await this.studentRepo.findOne({
        where: {
          id: updateNoteDto.studentId,
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
        throw new NotFoundException(
          'Student not found or does not belong to you',
        );
      }
      note.studentId = updateNoteDto.studentId;
    }

    if (updateNoteDto.subjectId !== undefined) {
      if (updateNoteDto.subjectId !== null) {
        const subject = await this.subjectRepo.findOne({
          where: {
            id: updateNoteDto.subjectId,
            teacher: {
              id: teacherId,
            },
          },
        });
        if (!subject) {
          throw new NotFoundException(
            'Subject not found or does not belong to you',
          );
        }
      }
      note.subjectId = updateNoteDto.subjectId;
    }

    if (updateNoteDto.title !== undefined) {
      note.title = updateNoteDto.title;
    }

    if (updateNoteDto.content !== undefined) {
      note.content = updateNoteDto.content;
    }

    if (updateNoteDto.tagIds !== undefined) {
      let tags: Tag[] = [];
      if (updateNoteDto.tagIds && updateNoteDto.tagIds.length > 0) {
        tags = await this.tagRepo.find({
          where: {
            id: In(updateNoteDto.tagIds),
            teacher: {
              id: teacherId,
            },
          },
        });
        if (tags.length !== updateNoteDto.tagIds.length) {
          throw new NotFoundException(
            'One or more tags not found or do not belong to you',
          );
        }
      }
      note.tags = tags;
    }

    await this.noteRepo.save(note);
    return this.findOne(teacherId, id);
  }

  async remove(teacherId: string, id: number) {
    const note = await this.findOne(teacherId, id);
    await this.noteRepo.remove(note);
    return { deleted: true };
  }
}
