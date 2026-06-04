import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async createUser(data: Partial<User>) {
    if (!data.password) {
      throw new Error('Password required');
    }

    const existing = await this.repo.findOne({
      where: { email: data.email },
    });

    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const rounds = 10;

    const user = this.repo.create({
      ...data,
      password: await bcrypt.hash(data.password, rounds),
      isVerified: false,
    });

    const savedUser = await this.repo.save(user);

    const { password, ...result } = savedUser;
    return result;
  }

  findByEmail(email: string) {
    return this.repo.findOneBy({ email });
  }

  findById(id: number) {
    return this.repo.findOneBy({ id });
  }

  async validateUser(email: string, password: string) {
    const user = await this.findByEmail(email);

    if (!user.isVerified) return null;

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;

    return user;
  }
}
