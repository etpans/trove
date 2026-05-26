import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { Teacher } from '../teachers/teacher.entity';
import { Student } from '../students/student.entity';
import { Subject } from '../subjects/subject.entity';

@Entity()
export class Class {
  // @PrimaryGeneratedColumn()
  @PrimaryColumn()
  id: number;

  @Column()
  name: string;

  @ManyToOne(() => Teacher, (teacher) => teacher.classes)
  teacher: Teacher;

  @OneToMany(() => Student, (student) => student.class)
  students: Student[];

  @OneToMany(() => Subject, (subject) => subject.class)
  subjects: Subject[];
  // @CreateDateColumn()
  // createdAt: Date;
}
