import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { AbstractEntity } from '../common/base.entity';
import { ClassEntity } from './class.entity';
import { Post } from '../notes/post.entity';

@Entity()
export class Subject extends AbstractEntity {
  @Column()
  name: string;

  @ManyToOne(() => ClassEntity, (c) => c.subjects, { nullable: true, onDelete: 'SET NULL' })
  classEntity?: ClassEntity;

  @OneToMany(() => Post, (p) => p.subject)
  posts?: Post[];
}
