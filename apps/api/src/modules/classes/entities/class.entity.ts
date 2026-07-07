import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../../auth/user.entity';
import { Student } from '../../students/entities/student.entity';

@Entity()
export class Class {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @ManyToOne(() => User, (user) => user.classes)
  @JoinColumn({ name: 'teacherId' })
  teacher: User;

  @OneToMany(() => Student, (student) => student.class)
  students: Student[];

  @Column({ type: 'date' })
  session: string;

  @CreateDateColumn()
  createdAt: Date;
}
