import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { Note } from './entities/note.entity';
import { Student } from '../students/entities/student.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { Tag } from '../tags/entities/tag.entity';
import { NoteAttachmentEntity } from './entities/note-attachment.entity';
import { ShareLinkEntity } from './entities/share-link.entity';
import { randomUUID } from 'crypto';

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
    @InjectRepository(NoteAttachmentEntity)
    private readonly attachmentRepo: Repository<NoteAttachmentEntity>,
    @InjectRepository(ShareLinkEntity)
    private readonly shareLinkRepo: Repository<ShareLinkEntity>,
  ) {}

  async create(teacherId: string, createNoteDto: CreateNoteDto) {
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
        attachments: true,
        shareLinks: true,
      },
      order: {
        createdAt: 'DESC',
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
        attachments: true,
        shareLinks: true,
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

  async addAttachment(
    teacherId: string,
    noteId: number,
    file: Express.Multer.File,
    caption?: string,
  ) {
    const note = await this.findOne(teacherId, noteId);

    // TODO: cloud upload to url to update fileUrl
    const attachment = this.attachmentRepo.create({
      note,
      fileUrl: file.path,
      fileType: file.mimetype,
      caption: caption ?? null,
    });

    return this.attachmentRepo.save(attachment);
  }

  async removeAttachment(
    teacherId: string,
    noteId: number,
    attachmentId: string,
  ) {
    const attachment = await this.attachmentRepo.findOne({
      where: {
        id: attachmentId,
        note: {
          id: noteId,
          teacherId,
        },
      },
      relations: {
        note: true,
      },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    await this.attachmentRepo.remove(attachment);

    return { deleted: true };
  }

  async createShareLink(teacherId: string, noteId: number) {
    const note = await this.findOne(teacherId, noteId);
    const existingShareLink = await this.shareLinkRepo.findOne({
      where: {
        noteId: note.id,
      },
    });

    if (existingShareLink) {
      return existingShareLink;
    }

    const shareLink = this.shareLinkRepo.create({
      note,
      token: randomUUID(),
    });

    return this.shareLinkRepo.save(shareLink);
  }

  async removeShareLink(teacherId: string, shareId: string) {
    const link = await this.shareLinkRepo.findOne({
      where: {
        id: shareId,
        note: {
          teacherId,
        },
      },
    });

    if (!link) {
      throw new NotFoundException();
    }

    await this.shareLinkRepo.remove(link);

    return { deleted: true };
  }

  async getSharedNote(token: string) {
    const shareLink = await this.shareLinkRepo.findOne({
      where: { token, isActive: true },
      relations: {
        note: {
          student: true,
          subject: true,
          tags: true,
          attachments: true,
        },
      },
    });

    if (!shareLink) {
      throw new NotFoundException('Shared link not found or inactive');
    }

    if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
      throw new NotFoundException('Shared link has expired');
    }

    return shareLink;
  }

  async likeSharedNote(token: string) {
    const shareLink = await this.shareLinkRepo.findOne({
      where: { token, isActive: true },
    });

    if (!shareLink) {
      throw new NotFoundException('Shared link not found or inactive');
    }

    if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
      throw new NotFoundException('Shared link has expired');
    }

    await this.shareLinkRepo.increment({ id: shareLink.id }, 'likeCount', 1);

    return { likeCount: shareLink.likeCount + 1 };
  }
}
