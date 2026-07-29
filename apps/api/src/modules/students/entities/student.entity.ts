import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Class } from '../../classes/entities/class.entity';
import { Note } from '../../notes/entities/note.entity';

@Entity()
export class Student {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  rollNumber?: string;

  @Index()
  @Column()
  classId: number;

  @ManyToOne(() => Class, (cls) => cls.students, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'classId' })
  class: Class;

  @OneToMany(() => Note, (note) => note.student, { cascade: true })
  notes: Note[];

  @CreateDateColumn()
  createdAt: Date;
}
