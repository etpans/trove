import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../auth/user.entity';
import { Note } from '../../notes/entities/note.entity';

@Entity()
export class Tag {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  teacherId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacherId' })
  teacher: User;

  @Column()
  name: string;

  @Column()
  color: string;

  // TODO: setup relation to Notes
  // @OneToMany(() => Note, (note) => note.subject)
  // notes: Note[];
}
