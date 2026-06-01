import { Controller, Post, Get, Delete, Param, Body } from '@nestjs/common';
import { NotesService } from './notes.service';
import { Post as PostEntity } from './post.entity';
import { Attachment } from './attachment.entity';
import { BaseController } from '../common/base.controller';

@Controller('notes')
export class NotesController extends BaseController<PostEntity> {
  constructor(private readonly service: NotesService) {
    super(service);
  }

  // attachments
  // keep attachment routes in addition to base CRUD
  @Post(':id/attachments')
  createAttachment(@Param('id') id: string, @Body() body: Partial<Attachment>) {
    return this.service.createAttachment(Number(id), body as any);
  }

  @Get(':id/attachments')
  findAttachments(@Param('id') id: string) {
    return this.service.findAttachmentsByPost(Number(id));
  }

  @Delete('attachments/:id')
  removeAttachment(@Param('id') id: string) {
    return this.service.removeAttachment(Number(id));
  }
}
