import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Décorateur pour restreindre l'accès à certains rôles.
 * Usage: @Roles('ADMIN', 'SUPER_ADMIN')
 */
export const Roles = (...roles: string[]): ReturnType<typeof SetMetadata> => SetMetadata(ROLES_KEY, roles);
