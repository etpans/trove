import { Entity, Column, OneToOne } from 'typeorm';
import { AbstractEntity } from '../common/base.entity';
import { Teacher } from '../teachers/teacher.entity';

@Entity()
export class User extends AbstractEntity {
  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  role: string;

  @OneToOne(() => Teacher, (teacher) => teacher.user)
  teacher: Teacher;

  @Column()
  isVerified: boolean;
}
