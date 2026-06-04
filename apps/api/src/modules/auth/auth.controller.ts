import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from './user.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Post('register')
  register(@Body() body: Partial<User>) {
    return this.service.createUser(body);
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const user = await this.service.validateUser(body.email, body.password);
    if (!user) return { ok: false, message: 'Invalid credentials' };
    const token = await this.service.login(user);
    return { ok: true, token };
  }
}
