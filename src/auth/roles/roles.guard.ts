import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from 'constants/roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      return false;
    }

    const requiredRoles =
      this.reflector.getAllAndOverride<Role[]>('roles', [
        context.getHandler(),
        context.getClass(),
      ]) || [];

    const userRoles = new Set<Role>();
    if (user?.role === Role.ADMIN || user?.isAdmin) {
      userRoles.add(Role.ADMIN);
    }
    if (user?.role === Role.USER) {
      userRoles.add(Role.USER);
    }

    if (requiredRoles.length === 0) {
      return userRoles.has(Role.ADMIN);
    }

    return requiredRoles.some((role) => userRoles.has(role));
  }
}
