import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { FileInterceptor } from '@nestjs/platform-express';

const NOTE_ATTACHMENT_DIR = 'uploads/note-attachments';

@UseGuards(AuthGuard('jwt'))
@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  create(
    @Request() req: { user: { userId: string } },
    @Body() createNoteDto: CreateNoteDto,
  ) {
    return this.notesService.create(req.user.userId, createNoteDto);
  }

  @Get()
  findAll(@Request() req: { user: { userId: string } }) {
    return this.notesService.findAll(req.user.userId);
  }

  @Get(':id')
  findOne(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.notesService.findOne(req.user.userId, +id);
  }

  @Patch(':id')
  update(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() updateNoteDto: UpdateNoteDto,
  ) {
    return this.notesService.update(req.user.userId, +id, updateNoteDto);
  }

  @Delete(':id')
  remove(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.notesService.remove(req.user.userId, +id);
  }

  @Post(':id/attachments')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          mkdirSync(NOTE_ATTACHMENT_DIR, { recursive: true });
          cb(null, NOTE_ATTACHMENT_DIR);
        },
        filename: (_req, file, cb) => {
          cb(null, `${randomUUID()}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  uploadAttachment(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('caption') caption?: string,
  ) {
    return this.notesService.addAttachment(req.user.userId, +id, file, caption);
  }

  @Delete(':noteId/attachments/:attachmentId')
  deleteAttachment(
    @Request() req: { user: { userId: string } },
    @Param('noteId') noteId: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.notesService.removeAttachment(
      req.user.userId,
      +noteId,
      attachmentId,
    );
  }

  @Post(':id/share')
  createShareLink(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.notesService.createShareLink(req.user.userId, +id);
  }

  @Delete('share/:shareId')
  removeShareLink(
    @Request() req: { user: { userId: string } },
    @Param('shareId') shareId: string,
  ) {
    return this.notesService.removeShareLink(req.user.userId, shareId);
  }
}

@Controller('share')
export class PublicShareController {
  constructor(private readonly notesService: NotesService) {}

  @Get(':token')
  getSharedNote(@Param('token') token: string) {
    return this.notesService.getSharedNote(token);
  }
}
