import { SetMetadata } from '@nestjs/common';
import { Role } from 'constants/roles';

export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);
