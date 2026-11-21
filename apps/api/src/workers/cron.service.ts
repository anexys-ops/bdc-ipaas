import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import * as cronParser from 'cron-parser';
import { PrismaService } from '../prisma/prisma.service';
import { TenantDatabaseService } from '../modules/tenants/tenant-database.service';
import { EngineService } from '../modules/engine/engine.service';
import { TickflowReporterService } from '../modules/engine/tickflow-reporter.service';
import { AppLoggerService } from '../common/logger/logger.service';
import { TriggerType } from '../generated/tenant';

@Injectable()
export class CronService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantDbService: TenantDatabaseService,
    private readonly engineService: EngineService,
    private readonly logger: AppLoggerService,
    private readonly tickflowReporter: TickflowReporterService,
  ) {}

  /**
   * Scanne toutes les minutes les flows avec trigger CRON et enqueue ceux qui sont dus.
   */
  @Cron('* * * * *')
  async scanCronFlows(): Promise<void> {
    this.logger.debug('Scan CRON flows démarré', 'CronService');

    const tenants = await this.prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true, dbConnectionHash: true },
    });

    const now = new Date();
    const windowEnd = new Date(now.getTime() + 60 * 1000);

    for (const tenant of tenants) {
      try {
        const client = await this.tenantDbService.getClient(tenant.id, tenant.dbConnectionHash);
        const flows = await client.flow.findMany({
          where: {
            triggerType: TriggerType.CRON,
            isActive: true,
          },
          select: { id: true, name: true, triggerConfig: true },
        });

        for (const flow of flows) {
          const config = flow.triggerConfig as { cron?: string } | null;
          const cronExpr = config?.cron;
          if (!cronExpr || typeof cronExpr !== 'string') {
            this.logger.warn(
              `Flow ${flow.id} (tenant=${tenant.id}) sans triggerConfig.cron valide, ignoré`,
              'CronService',
            );
            continue;
          }

          try {
            const interval = cronParser.parseExpression(cronExpr, { currentDate: now });
            const next = interval.next().toDate();
            if (next <= windowEnd) {
              this.logger.log(
                `Enqueue flow ${flow.name} (${flow.id}) pour CRON (next=${next.toISOString()})`,
                'CronService',
              );
              await this.engineService.executeFlow(tenant.id, flow.id, {
                triggerSource: 'CRON',
              });
            }
          } catch (parseErr) {
            const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
            this.logger.warn(
              `Expression cron invalide pour flow ${flow.id}: "${cronExpr}" - ${msg}`,
              'CronService',
            );
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Erreur scan CRON tenant ${tenant.id}: ${msg}`, undefined, 'CronService');
      }
    }

    this.logger.debug('Scan CRON flows terminé', 'CronService');
  }

  /**
   * Toutes les 10 minutes : publie vers Tickflow l'état de chaque flux de production rattaché
   * (triggerConfig.tickflow), déduit de sa dernière exécution terminée. Sert aussi de battement de cœur.
   */
  @Cron('*/10 * * * *')
  async reportTickflowStatuses(): Promise<void> {
    if (!this.tickflowReporter.enabled) return;
    const tenants = await this.prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true, dbConnectionHash: true },
    });
    const items = [];
    for (const tenant of tenants) {
      try {
        const client = await this.tenantDbService.getClient(tenant.id, tenant.dbConnectionHash);
        const flows = await client.flow.findMany({
          where: { isActive: true, environment: 'PRODUCTION' },
          select: { id: true, triggerConfig: true },
        });
        for (const flow of flows) {
          const mapping = TickflowReporterService.mappingOf(flow.triggerConfig);
          if (!mapping) continue;
          const last = await client.flowExecution.findFirst({
            where: { flowId: flow.id, isDryRun: false, finishedAt: { not: null } },
            orderBy: { startedAt: 'desc' },
          });
          items.push(this.tickflowReporter.statusItem(mapping, last));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Erreur état Tickflow tenant ${tenant.id}: ${msg}`, undefined, 'CronService');
      }
    }
    await this.tickflowReporter.reportStatuses(items);
  }
}
