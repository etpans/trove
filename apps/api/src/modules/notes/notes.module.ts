import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './post.entity';
import { Attachment } from './attachment.entity';
import { NotesService } from './notes.service';
import { NotesController } from './notes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Post, Attachment])],
  providers: [NotesService],
  controllers: [NotesController],
  exports: [NotesService],
})
export class NotesModule {}
