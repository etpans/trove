import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from './post.entity';
import { Attachment } from './attachment.entity';
import { BaseService } from '../common/base.service';

@Injectable()
export class NotesService extends BaseService<Post> {
  constructor(
    @InjectRepository(Post)
    postRepo: Repository<Post>,
    @InjectRepository(Attachment)
    private readonly attachmentRepo: Repository<Attachment>,
  ) {
    super(postRepo);
  }

  // override create to handle attachments
  async create(data: Partial<Post> & { attachments?: Partial<Attachment>[] }) {
    const { attachments, ...postData } = data as any;
    const saved = await super.create(postData as any);
    if (attachments && attachments.length) {
      const attachEntities = attachments.map((a) => this.attachmentRepo.create({ ...(a as any), post: saved }));
      await this.attachmentRepo.save(attachEntities);
      (saved as any).attachments = attachEntities;
    }
    return saved;
  }

  // include attachments when fetching
  findAll() {
    return (this.repo as Repository<Post>).find({ relations: { attachments: true } });
  }

  findOne(id: number) {
    return (this.repo as Repository<Post>).findOne({ where: { id }, relations: { attachments: true } });
  }

  // attachments helpers
  createAttachment(postId: number, data: Partial<Attachment>) {
    const attachment = this.attachmentRepo.create({ ...(data as any), post: { id: postId } as any });
    return this.attachmentRepo.save(attachment);
  }

  findAttachmentsByPost(postId: number) {
    return this.attachmentRepo.find({ where: { post: { id: postId } as any }, relations: { post: true } });
  }

  findAttachment(id: number) {
    return this.attachmentRepo.findOneBy({ id });
  }

  removeAttachment(id: number) {
    return this.attachmentRepo.delete(id);
  }
}
