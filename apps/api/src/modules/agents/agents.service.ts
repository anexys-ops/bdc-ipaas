import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '../../generated/tenant';
import { TenantDatabaseService } from '../tenants/tenant-database.service';
import { TenantsService } from '../tenants/tenants.service';
import * as crypto from 'crypto';

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);

  constructor(
    private readonly tenantDbService: TenantDatabaseService,
    private readonly tenantsService: TenantsService,
  ) {}

  private async getTenantClient(tenantId: string): Promise<PrismaClient> {
    const tenant = await this.tenantsService.getTenantWithHash(tenantId);
    return this.tenantDbService.getClient(tenantId, tenant.dbConnectionHash);
  }

  async createAgentToken(tenantId: string, name: string, watchPaths: string[]): Promise<{ id: string; token: string }> {
    const prisma = await this.getTenantClient(tenantId);
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const agent = await prisma.agentToken.create({
      data: { name, tokenHash, watchPaths: watchPaths as object },
    });

    this.logger.log(`Token agent créé: ${agent.id}`);
    return { id: agent.id, token };
  }

  async listAgents(tenantId: string): Promise<Array<{ id: string; name: string; isActive: boolean; lastSeenAt: Date | null }>> {
    const prisma = await this.getTenantClient(tenantId);
    const agents = await prisma.agentToken.findMany({ orderBy: { createdAt: 'desc' } });
    return agents.map(a => ({ id: a.id, name: a.name, isActive: a.isActive, lastSeenAt: a.lastSeenAt }));
  }

  async revokeAgent(tenantId: string, agentId: string): Promise<void> {
    const prisma = await this.getTenantClient(tenantId);
    await prisma.agentToken.update({ where: { id: agentId }, data: { isActive: false } });
    this.logger.log(`Agent révoqué: ${agentId}`);
  }

  async deleteAgent(tenantId: string, agentId: string): Promise<void> {
    const prisma = await this.getTenantClient(tenantId);
    await prisma.agentToken.delete({ where: { id: agentId } });
  }

  async validateToken(tenantId: string, token: string): Promise<{ valid: boolean; agentId?: string }> {
    const prisma = await this.getTenantClient(tenantId);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const agent = await prisma.agentToken.findUnique({ where: { tokenHash } });

    if (!agent || !agent.isActive) return { valid: false };

    await prisma.agentToken.update({ where: { id: agent.id }, data: { lastSeenAt: new Date() } });
    return { valid: true, agentId: agent.id };
  }
}
