import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { AbstractEntity } from '../common/base.entity';
import { Teacher } from '../teachers/teacher.entity';
import { Student } from '../students/student.entity';
import { Subject } from './subject.entity';

@Entity()
export class ClassEntity extends AbstractEntity {
  @Column()
  name: string;

  @ManyToOne(() => Teacher, (t) => t.classes, { nullable: true, onDelete: 'SET NULL' })
  teacher?: Teacher;

  @OneToMany(() => Student, (s) => s.classEntity)
  students?: Student[];

  @OneToMany(() => Subject, (sub) => sub.classEntity)
  subjects?: Subject[];
}
