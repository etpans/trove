import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  ManyToMany,
  Index,
} from 'typeorm';
import { User } from '../../auth/user.entity';
import { Note } from '../../notes/entities/note.entity';

@Entity()
export class Tag {
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

  @ManyToMany(() => Note, (note) => note.tags)
  notes: Note[];
}
