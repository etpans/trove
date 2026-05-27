import { Entity, Column, OneToMany } from 'typeorm';
import { AbstractEntity } from '../common/base.entity';
import { ClassEntity } from '../academics/class.entity';
import { Post } from '../notes/post.entity';

@Entity()
export class Teacher extends AbstractEntity {
  @Column()
  firstName: string;

  @Column({ nullable: true })
  middleName?: string;

  @Column()
  lastName: string;

  @OneToMany(() => ClassEntity, (cls) => cls.teacher)
  classes?: ClassEntity[];

  @OneToMany(() => Post, (post) => post.teacher)
  posts?: Post[];
}
