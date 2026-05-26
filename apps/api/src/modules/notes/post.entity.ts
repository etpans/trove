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
export class Post {
  // @PrimaryGeneratedColumn()
  @PrimaryColumn()
  id: number;

  @Column()
  type: 'text' | 'image' | 'video';

  @Column({ nullable: true })
  textContent?: string;

  @Column({ nullable: true })
  imageUrl?: string;

  @Column({ nullable: true })
  videoUrl?: string;

  @ManyToOne(() => Teacher, (teacher) => teacher.posts)
  teacher: Teacher;

  @ManyToOne(() => Student, (student) => student.posts)
  student: Student;

  @ManyToOne(() => Subject, (subject) => subject.posts)
  subject: Subject;

  @CreateDateColumn()
  createdAt: Date;
}
