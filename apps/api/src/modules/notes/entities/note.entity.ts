import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
  Index,
} from 'typeorm';
import { Student } from '../../students/entities/student.entity';
import { User } from '../../auth/user.entity';
import { Subject } from '../../subjects/entities/subject.entity';
import { Tag } from '../../tags/entities/tag.entity';
import { NoteAttachmentEntity } from './note-attachment.entity';
import { ShareLinkEntity } from './share-link.entity';

@Entity()
export class Note {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  content: string | null;

  @Index()
  @Column()
  studentId: number;

  @ManyToOne(() => Student, (student) => student.notes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @Index()
  @Column({ nullable: true })
  subjectId?: number;

  @OneToMany(() => NoteAttachmentEntity, (a) => a.note, { cascade: true })
  attachments: NoteAttachmentEntity[];

  @OneToMany(() => ShareLinkEntity, (sl) => sl.note, { cascade: true })
  shareLinks: ShareLinkEntity[];

  @ManyToOne(() => Subject, (subject) => subject.notes, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'subjectId' })
  subject?: Subject;

  @Index()
  @Column()
  teacherId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacherId' })
  teacher: User;

  @ManyToMany(() => Tag, (tag) => tag.notes)
  @JoinTable()
  tags: Tag[];

  @UpdateDateColumn()
  updatedAt: Date;

  @Index()
  @CreateDateColumn()
  createdAt: Date;
}
