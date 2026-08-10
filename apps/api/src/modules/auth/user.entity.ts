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
  @Column({ nullable: true, select: false })
  verificationCodeHash?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  verificationCodeExpiry?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  verificationCodeSentAt?: Date | null;

  @Column({ default: 0 })
  verificationCodeAttempts: number;

  @Index()
  @Column({ nullable: true, select: false })
  passwordResetCodeHash?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  passwordResetCodeExpiry?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  passwordResetCodeSentAt?: Date | null;

  @Column({ default: 0 })
  passwordResetCodeAttempts: number;

  @Column({ default: 0 })
  failedLoginAttempts: number;

  @Column({ type: 'timestamptz', nullable: true })
  lockedUntil?: Date | null;

  // TODO: change this to include student entity; teacher -> students -> notes
  // @OneToMany(() => Note, (note) => note.teacher, { cascade: true })
  // notes: Note[];

  @CreateDateColumn()
  createdAt: Date;
}
