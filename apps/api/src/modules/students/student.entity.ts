import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { Class } from '../classes/class.entity';
import { Posts } from '../posts/posts.entity';

@Entity()
export class Student {
  // @PrimaryGeneratedColumn()
  @PrimaryColumn()
  id: number;

  @Column()
  firstName: string;

  @Column()
  middleName: string;

  @Column()
  lastName: string;

  @Column()
  teacher: string;

  @ManyToOne(() => Class, (cls) => cls.students)
  classes: Class;

  @OneToMany(() => Post, (post) => post.student)
  posts: Post[];

  @Column()
  grade: number;

  // @CreateDateColumn()
  // createdAt: Date;
}
