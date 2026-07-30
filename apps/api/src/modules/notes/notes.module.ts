import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotesService } from './notes.service';
import { NotesController, PublicShareController } from './notes.controller';
import { Note } from './entities/note.entity';
import { Student } from '../students/entities/student.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { Tag } from '../tags/entities/tag.entity';
import { NoteAttachmentEntity } from './entities/note-attachment.entity'
import { ShareLinkEntity } from './entities/share-link.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Note, Student, Subject, Tag, NoteAttachmentEntity, ShareLinkEntity])],
  controllers: [NotesController, PublicShareController],
  providers: [NotesService],
})
export class NotesModule {}
