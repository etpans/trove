@Entity()
export class Subject {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @ManyToOne(() => Class, (cls) => cls.subjects)
  class: Class;

  @OneToMany(() => Post, (post) => post.subject)
  posts: Post[];
}
