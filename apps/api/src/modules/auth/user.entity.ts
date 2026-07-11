import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
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

  @Column({ nullable: true, select: false })
  verificationToken?: string;

  @Column({ type: 'timestamptz', nullable: true })
  verificationExpiry?: Date;

  @Column({ default: 0 })
  failedLoginAttempts: number;

  @Column({ type: 'timestamptz', nullable: true })
  lockedUntil?: Date;

  // TODO: change this to include student entity; teacher -> students -> notes
  // @OneToMany(() => Note, (note) => note.teacher, { cascade: true })
  // notes: Note[];

  @CreateDateColumn()
  createdAt: Date;
}
