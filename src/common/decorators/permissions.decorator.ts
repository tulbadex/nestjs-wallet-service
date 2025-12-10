import { SetMetadata } from '@nestjs/common';
import { ApiKeyPermission } from '../../database/entities/api-key.entity';

export const RequirePermissions = (...permissions: ApiKeyPermission[]) => 
  SetMetadata('permissions', permissions);