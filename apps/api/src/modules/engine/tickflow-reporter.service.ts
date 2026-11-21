import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Rattachement d'un flux Ultimate à un flux Tickflow : `triggerConfig.tickflow`. */
export interface TickflowMapping {
  clientCode: string;
  flowCode: string;
}

export interface TickflowExecution {
  id: string;
  status: string;
  startedAt: Date;
  finishedAt: Date | null;
  recordsIn: number;
  recordsOut: number;
  recordsFailed: number;
  errorMessage?: string | null;
}

interface StatusItem {
  client_code: string;
  flow_code: string;
  server_code: string;
  checked_at: string;
  status: 'ok' | 'warning' | 'critical' | 'unknown';
  issues: { code: string; level: 'warning' | 'critical'; message: string; action?: string }[];
}

const RUN_RESULT: Record<string, string> = { SUCCESS: 'success', PARTIAL: 'partial', FAILED: 'failed' };

/**
 * Publie les exécutions et l'état des flux vers le monitoring Tickflow (météo des flux).
 * Inactif tant que TICKFLOW_MONITORING_URL et TICKFLOW_MONITORING_TOKEN ne sont pas définis.
 * Ne lève jamais d'erreur : le monitoring ne doit pas faire échouer une exécution.
 */
@Injectable()
export class TickflowReporterService {
  private readonly logger = new Logger(TickflowReporterService.name);
  private readonly url: string;
  private readonly token: string;
  private readonly serverCode: string;

  constructor(configService: ConfigService) {
    this.url = (configService.get<string>('TICKFLOW_MONITORING_URL') ?? '').replace(/\/+$/, '');
    this.token = configService.get<string>('TICKFLOW_MONITORING_TOKEN') ?? '';
    this.serverCode = configService.get<string>('TICKFLOW_SERVER_CODE') ?? 'ultimate';
  }

  get enabled(): boolean {
    return Boolean(this.url && this.token);
  }

  /** Lit `triggerConfig.tickflow` ; null si le flux n'est pas rattaché. */
  static mappingOf(triggerConfig: unknown): TickflowMapping | null {
    const tickflow = (triggerConfig as { tickflow?: Partial<TickflowMapping> } | null)?.tickflow;
    const valid = (value: unknown): value is string =>
      typeof value === 'string' && /^[a-z0-9_-]{1,80}$/.test(value);
    return tickflow && valid(tickflow.clientCode) && valid(tickflow.flowCode)
      ? { clientCode: tickflow.clientCode, flowCode: tickflow.flowCode }
      : null;
  }

  /** État du flux déduit de sa dernière exécution terminée. */
  statusItem(mapping: TickflowMapping, last: TickflowExecution | null, now = new Date()): StatusItem {
    const issues: StatusItem['issues'] = [];
    if (last?.status === 'FAILED') {
      issues.push({
        code: 'x_execution_failed',
        level: 'critical',
        message: `Dernière exécution en échec : ${(last.errorMessage || 'voir les logs Ultimate').slice(0, 250)}`,
        action: `Ouvrir l'exécution ${last.id} dans Ultimate`,
      });
    } else if (last?.status === 'PARTIAL') {
      issues.push({
        code: 'x_execution_partial',
        level: 'warning',
        message: `Dernière exécution partielle : ${last.recordsFailed} enregistrement(s) en erreur sur ${last.recordsIn}`,
        action: `Ouvrir l'exécution ${last.id} dans Ultimate`,
      });
    }
    return {
      client_code: mapping.clientCode,
      flow_code: mapping.flowCode,
      server_code: this.serverCode,
      checked_at: now.toISOString(),
      status: issues.some((i) => i.level === 'critical') ? 'critical' : issues.length ? 'warning' : last ? 'ok' : 'unknown',
      issues,
    };
  }

  /** Publie une exécution terminée (passage + état). Les dry-runs ne sont pas publiés. */
  async reportExecution(triggerConfig: unknown, execution: TickflowExecution): Promise<void> {
    const mapping = TickflowReporterService.mappingOf(triggerConfig);
    const result = RUN_RESULT[execution.status];
    if (!this.enabled || !mapping || !result) return;
    const failed = execution.status === 'FAILED';
    await this.post('/runs', {
      client_code: mapping.clientCode,
      flow_code: mapping.flowCode,
      server_code: this.serverCode,
      run_id: `ultimate:${execution.id}`,
      started_at: execution.startedAt.toISOString(),
      ended_at: (execution.finishedAt ?? new Date()).toISOString(),
      result: !failed && execution.recordsIn === 0 ? 'nothing_to_do' : result,
      counts: {
        received: execution.recordsIn,
        processed: execution.recordsOut,
        errors: failed ? Math.max(execution.recordsFailed, 1) : execution.recordsFailed,
      },
      items_in_error: failed
        ? [{ ref: `execution ${execution.id}`, message: (execution.errorMessage || 'Exécution en échec').slice(0, 300) }]
        : [],
    });
    await this.post('/status', this.statusItem(mapping, execution));
  }

  /** Publie l'état courant de plusieurs flux (battement de cœur). */
  async reportStatuses(items: StatusItem[]): Promise<void> {
    if (!this.enabled) return;
    for (let i = 0; i < items.length; i += 100) {
      await this.post('/status/batch', { items: items.slice(i, i + 100) });
    }
  }

  private async post(path: string, body: unknown): Promise<void> {
    try {
      const response = await fetch(this.url + path, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        this.logger.warn(`Tickflow ${path} → HTTP ${response.status} ${(await response.text()).slice(0, 200)}`);
      }
    } catch (error) {
      this.logger.warn(`Tickflow ${path} injoignable : ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
