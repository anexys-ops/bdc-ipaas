import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../../modules/auth/interfaces';

interface TenantInfo {
  id: string;
  slug: string;
}

/**
 * Décorateur pour injecter les informations du tenant courant.
 * Usage: @CurrentTenant() tenant: TenantInfo
 */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantInfo => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    const user = request.user;

    return {
      id: user.tenantId,
      slug: user.tenantSlug,
    };
  },
);
