import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import bcrypt from "bcrypt";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  createUser(data: Partial<User>) {
    return this.repo.save(this.repo.create(data));
  }

  findByEmail(email: string) {
    return this.repo.findOneBy({ email });
  }

  findById(id: number) {
    return this.repo.findOneBy({ id });
  }

  private readonly fakeHash = "$2a$12$XFYjNK2IrwgNOKtPBLYDxOE5Q16qMEA5q7cnDlihCK.eY627TnWtK";

  async validateUser(email: string, password: string) {
    const user = await this.findByEmail(email);

    if (!user) {
      // simulate bcrypt latency to prevent user emails from being found
      await bcrypt.compare(password, this.fakeHash);
      return null;
    }

    if (!user.isVerified) return null;

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;

    return user;
  }
}
