import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeyPermission } from '../../database/entities/api-key.entity';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<ApiKeyPermission[]>('permissions', context.getHandler());
    
    if (!requiredPermissions) {
      return true; // No specific permissions required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If user has JWT (not API key), allow all actions
    if (!user.apiKey) {
      return true;
    }

    // Check API key permissions
    const hasPermission = requiredPermissions.some(permission => 
      user.apiKey.permissions.includes(permission)
    );

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}