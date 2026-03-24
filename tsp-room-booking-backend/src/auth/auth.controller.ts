import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Role } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Register endpoint
  @Post('register')
  async register(
    @Body('name') name: string,
    @Body('email') email: string,
    @Body('role') role?: Role,
  ) {
    const user = await this.authService.register(name, email, role);
    return { user };
  }

  // Login endpoint
  @Post('login')
  async login(
    @Body('email') email: string,
  ) {
    const user = await this.authService.validateUser(email);
    return this.authService.login({
      id: user.id,
      email: user.email,
      name: user.name, // ✅ required by login
      role: user.role,
    });
  }
}
