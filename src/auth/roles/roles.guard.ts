import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from 'constants/roles';
import { AuthService } from '../auth.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authService: AuthService, // You might need to use AuthService for fetching user details
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<Role[]>('roles', context.getHandler());
    if (!requiredRoles) {
      return true; // No role required
    } 
    
    const request = context.switchToHttp().getRequest();
    const user = request.user;  // Assuming user is attached to the request (usually from JWT)

    // Check if user has required role
    // return requiredRoles.some((role) => useRole.includes(role));
    return user.isAdmin;
  }
}
