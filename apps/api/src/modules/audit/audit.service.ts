import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditLogEntry {
  id: string;
  tenantId: string;
  userId: string | null;
  action: string;
  resource: string;
  resourceId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(entry: Omit<AuditLogEntry, 'id' | 'createdAt'>): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId: entry.tenantId,
          userId: entry.userId,
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId,
          before: (entry.before as object) || undefined,
          after: (entry.after as object) || undefined,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
        },
      });
    } catch (err) {
      this.logger.error(`Erreur lors de l'audit: ${(err as Error).message}`);
    }
  }

  async getLogs(tenantId: string, options: { userId?: string; action?: string; resource?: string; from?: Date; to?: Date; limit?: number; offset?: number } = {}): Promise<{ logs: AuditLogEntry[]; total: number }> {
    const where: Record<string, unknown> = { tenantId };
    if (options.userId) where.userId = options.userId;
    if (options.action) where.action = options.action;
    if (options.resource) where.resource = options.resource;
    if (options.from || options.to) {
      where.createdAt = {};
      if (options.from) (where.createdAt as Record<string, Date>).gte = options.from;
      if (options.to) (where.createdAt as Record<string, Date>).lte = options.to;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.limit || 50,
        skip: options.offset || 0,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs: logs.map(l => ({
        id: l.id,
        tenantId: l.tenantId,
        userId: l.userId,
        action: l.action,
        resource: l.resource,
        resourceId: l.resourceId || undefined,
        before: l.before as Record<string, unknown> | undefined,
        after: l.after as Record<string, unknown> | undefined,
        ipAddress: l.ipAddress || undefined,
        userAgent: l.userAgent || undefined,
        createdAt: l.createdAt,
      })),
      total,
    };
  }

  async getRecentActivity(tenantId: string, limit: number = 20): Promise<AuditLogEntry[]> {
    const { logs } = await this.getLogs(tenantId, { limit });
    return logs;
  }

  async getUserActivity(tenantId: string, userId: string): Promise<AuditLogEntry[]> {
    const { logs } = await this.getLogs(tenantId, { userId, limit: 100 });
    return logs;
  }
}
