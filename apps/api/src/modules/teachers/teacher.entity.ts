import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Class } from '../classes/classes.entity';

@Entity()
export class Teacher {
  // @PrimaryGeneratedColumn()
  @PrimaryColumn()
  id: number;

  @Column()
  firstName: string;

  @Column()
  middleName: string;

  @Column()
  lastName: string;

  @OneToMany(() => Class, (cls) => cls.teacher)
  Classes: Class[];

  @OneToMany(() => Post, (post) => post.teacher)
  posts: Post[];

  // @CreateDateColumn()
  // createdAt: Date;
}
