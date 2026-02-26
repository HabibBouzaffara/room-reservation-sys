import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // Validate user credentials
  async validateUser(email: string, password: string) {
    const userWithPassword = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        password: true,
        isApproved: true,
      },
    });

    if (!userWithPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, userWithPassword.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!userWithPassword.isApproved) {
      throw new UnauthorizedException('Your account has not been approved by an Admin yet.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...safeUser } = userWithPassword;
    return safeUser;
  }

  // Login and return JWT token
  login(user: { id: number; email: string; name: string; role: Role }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return { access_token: this.jwtService.sign(payload) };
  }

  // Register a new user
  async register(
    name: string,
    email: string,
    password: string,
    role: Role = Role.USER,
  ) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    const count = await this.prisma.user.count();
    const isFirstUser = count === 0;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        role: isFirstUser ? Role.ADMIN : role,
        password: hashedPassword,
        isApproved: isFirstUser ? true : false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isApproved: true,
      },
    });

    return user;
  }
}
