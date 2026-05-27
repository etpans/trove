import { Entity, Column, ManyToOne } from 'typeorm';
import { AbstractEntity } from '../common/base.entity';
import { Post } from './post.entity';

@Entity()
export class Attachment extends AbstractEntity {
  @Column()
  url: string;

  @Column({ nullable: true })
  description?: string;

  @ManyToOne(() => Post, (p) => p.attachments, { onDelete: 'CASCADE' })
  post: Post;
}
