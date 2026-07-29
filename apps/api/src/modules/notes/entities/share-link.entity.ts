import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Note } from './note.entity';

@Entity()
export class ShareLinkEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ unique: true })
  noteId: number;

  @ManyToOne(() => Note, (note) => note.shareLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'noteId' })
  note: Note;

  @Index()
  @Column({ unique: true })
  token: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  allowComments: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
