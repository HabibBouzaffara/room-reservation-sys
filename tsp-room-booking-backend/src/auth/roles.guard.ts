import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, User } from '@prisma/client';
import { Request } from 'express';

// Extend Express Request to include user
interface RequestWithUser extends Request {
  user: User;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<Role[]>(
      'roles',
      context.getHandler(),
    );
    if (!requiredRoles) return true;

    // Type the request to remove unsafe assignment warning
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    return requiredRoles.includes(user.role);
  }
}
