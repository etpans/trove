import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Student } from '../../students/entities/student.entity';
import { User } from '../../auth/user.entity';
import { Subject } from '../../subjects/entities/subject.entity';
import { Tag } from '../../tags/entities/tag.entity';

@Entity()
export class Note {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column()
  studentId: number;

  @ManyToOne(() => Student, (student) => student.notes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @Column({ nullable: true })
  subjectId?: number;

  @ManyToOne(() => Subject, (subject) => subject.notes, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'subjectId' })
  subject?: Subject;

  @Column()
  teacherId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacherId' })
  teacher: User;

  @ManyToMany(() => Tag, (tag) => tag.notes)
  @JoinTable()
  tags: Tag[];

  @CreateDateColumn()
  createdAt: Date;
}
