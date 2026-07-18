import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Note } from './note.entity';

@Entity()
export class NoteAttachmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  noteId: string;

  @ManyToOne(() => Note, (note) => note.attachments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'noteId' })
  note: Note;

  @Column()
  fileUrl: string;

  @Column()
  fileType: string;

  @Column({ nullable: true, type: 'text' })
  caption: string | null;

  // @Column({ type: 'jsonb', nullable: true })
  // annotations: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}
