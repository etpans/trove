import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { AbstractEntity } from '../common/base.entity';
import { ClassEntity } from '../academics/class.entity';
import { Post } from '../notes/post.entity';

@Entity()
export class Student extends AbstractEntity {
  @Column()
  firstName: string;

  @Column({ nullable: true })
  middleName?: string;

  @Column()
  lastName: string;

  @ManyToOne(() => ClassEntity, (cls) => cls.students, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  classEntity?: ClassEntity;

  @OneToMany(() => Post, (post) => post.student)
  posts?: Post[];

  @Column()
  grade: number;
}
