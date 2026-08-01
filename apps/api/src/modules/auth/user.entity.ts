import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Class } from '../classes/entities/class.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column()
  displayName: string;

  @OneToMany(() => Class, (classes) => classes.teacher)
  classes: Class[];

  @Column({ default: false })
  isVerified: boolean;

  @Index()
  @Column({ type: 'varchar', nullable: true, select: false })
  verificationToken: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  verificationExpiry: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastVerificationEmailSentAt: Date | null;

  @Column({ default: 0 })
  failedLoginAttempts: number;

  @Column({ type: 'timestamptz', nullable: true })
  lockedUntil: Date | null;

  // TODO: change this to include student entity; teacher -> students -> notes
  // @OneToMany(() => Note, (note) => note.teacher, { cascade: true })
  // notes: Note[];

  @CreateDateColumn()
  createdAt: Date;
}
