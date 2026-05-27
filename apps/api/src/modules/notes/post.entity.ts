import { Entity, Column, OneToMany, ManyToOne } from 'typeorm';
import { AbstractEntity } from '../common/base.entity';
import { Attachment } from './attachment.entity';
import { Teacher } from '../teachers/teacher.entity';
import { Student } from '../students/student.entity';
import { Subject } from '../academics/subject.entity';

@Entity()
export class Post extends AbstractEntity {
  @Column()
  type: string;

  @Column({ nullable: true })
  textContent?: string;

  @OneToMany(() => Attachment, (a) => a.post, { cascade: true })
  attachments?: Attachment[];

  @ManyToOne(() => Teacher, (teacher) => teacher.posts, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  teacher?: Teacher;

  @ManyToOne(() => Student, (student) => student.posts, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  student?: Student;

  @ManyToOne(() => Subject, (subject) => subject.posts, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  subject?: Subject;
}
