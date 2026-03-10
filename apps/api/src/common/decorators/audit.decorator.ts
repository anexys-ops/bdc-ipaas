import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'audit';

export interface AuditMetadata {
  action: string;
  resource: string;
}

/**
 * Marque une route pour l'audit. L'interceptor enregistrera l'action après succès.
 * Utiliser pour les routes protégées (JwtAuthGuard) ; pour login/logout, appeler auditService.log manuellement.
 */
export const Audit = (action: string, resource: string) =>
  SetMetadata(AUDIT_KEY, { action, resource } satisfies AuditMetadata);
