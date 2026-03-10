import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { AuditService } from '../../modules/audit/audit.service';
import { AUDIT_KEY, type AuditMetadata } from '../decorators/audit.decorator';
import { AuthenticatedUser } from '../../modules/auth/interfaces';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const auditMeta = this.reflector.getAllAndOverride<AuditMetadata | undefined>(AUDIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!auditMeta) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      return next.handle();
    }

    const tenantId = user.tenantId;
    const userId = user.id;
    const resourceId = (request.params as { id?: string })?.id;
    const ipAddress = request.ip ?? request.socket?.remoteAddress;
    const userAgent = request.get('user-agent') ?? undefined;

    return next.handle().pipe(
      tap(() => {
        this.auditService
          .log({
            tenantId,
            userId,
            action: auditMeta.action,
            resource: auditMeta.resource,
            resourceId,
            ipAddress,
            userAgent,
          })
          .catch(() => {
            // Erreur déjà loggée dans AuditService
          });
      }),
    );
  }
}
