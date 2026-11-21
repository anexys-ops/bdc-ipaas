import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantDatabaseService } from './tenant-database.service';
import { TickflowReporterService, TickflowClientWeather } from '../engine/tickflow-reporter.service';

export interface TenantFlowWeather {
  /** false tant que la liaison Tickflow n'est pas configurée ou qu'aucun client n'est rattaché. */
  enabled: boolean;
  clients: TickflowClientWeather[];
}

/** Météo des flux du tenant courant, lue dans la base de monitoring Tickflow (même source que l'équipe BDC). */
@Injectable()
export class TenantFlowWeatherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantDbService: TenantDatabaseService,
    private readonly tickflowReporter: TickflowReporterService,
  ) {}

  async getForTenant(tenantId: string): Promise<TenantFlowWeather> {
    if (!this.tickflowReporter.enabled) return { enabled: false, clients: [] };
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true, dbConnectionHash: true },
    });
    if (!tenant) return { enabled: false, clients: [] };
    let triggerConfigs: unknown[] = [];
    try {
      const client = await this.tenantDbService.getClient(tenantId, tenant.dbConnectionHash);
      triggerConfigs = (await client.flow.findMany({ select: { triggerConfig: true } })).map((f) => f.triggerConfig);
    } catch {
      // Base tenant indisponible : on garde les clients déclarés par configuration.
    }
    const codes = this.tickflowReporter.clientCodesFor(tenant.slug, triggerConfigs);
    const clients = (await Promise.all(codes.map((code) => this.tickflowReporter.getClientWeather(code)))).filter(
      (weather): weather is TickflowClientWeather => weather !== null,
    );
    return { enabled: codes.length > 0, clients };
  }
}
