import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from '../../auth/user.entity';
import { Note } from '../../notes/entities/note.entity';

@Entity()
export class Subject {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  teacherId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacherId' })
  teacher: User;

  @Column()
  name: string;

  @Column()
  color: string;

  @OneToMany(() => Note, (note) => note.subject)
  notes: Note[];
}
