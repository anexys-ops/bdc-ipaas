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

export interface TickflowFlowWeather {
  flow_code: string;
  name: string;
  type: string;
  source: { system: string; label?: string };
  target: { system: string; label?: string };
  project: string | null;
  in_production_since: string | null;
  tracked_since: string | null;
  silent: boolean;
  status: 'ok' | 'warning' | 'critical' | 'unknown' | 'maintenance';
  last_run_at: string | null;
  last_run_result: string | null;
  last_failed_run_at: string | null;
  last_issue: { level: string; message: string; opened_at: string; resolved_at: string | null; client_notified_at: string | null } | null;
  open_issues: { level: string; message: string; opened_at: string; client_notified_at: string | null }[];
  runs: { today: number; month: number; year: number };
  documents: { today: number; month: number; year: number };
}

export interface TickflowClientWeather {
  client_code: string;
  name: string;
  generated_at: string;
  flows: TickflowFlowWeather[];
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
  private readonly tenantClients: Record<string, string | string[]>;
  private readonly weatherCache = new Map<string, { at: number; value: TickflowClientWeather }>();

  constructor(configService: ConfigService) {
    this.url = (configService.get<string>('TICKFLOW_MONITORING_URL') ?? '').replace(/\/+$/, '');
    this.token = configService.get<string>('TICKFLOW_MONITORING_TOKEN') ?? '';
    this.serverCode = configService.get<string>('TICKFLOW_SERVER_CODE') ?? 'ultimate';
    let tenantClients: Record<string, string | string[]> = {};
    try {
      tenantClients = JSON.parse(configService.get<string>('TICKFLOW_TENANT_CLIENTS') || '{}');
    } catch {
      this.logger.warn('TICKFLOW_TENANT_CLIENTS : JSON invalide, ignoré');
    }
    this.tenantClients = tenantClients;
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

  /**
   * Codes clients Tickflow d'un tenant : ceux de ses flux rattachés (triggerConfig.tickflow), plus
   * ceux de TICKFLOW_TENANT_CLIENTS ({"slug": "code" | ["code", …]}) pour les flux hébergés ailleurs (n8n, EDI).
   */
  clientCodesFor(tenantSlug: string, triggerConfigs: unknown[]): string[] {
    const codes = new Set<string>();
    for (const triggerConfig of triggerConfigs) {
      const mapping = TickflowReporterService.mappingOf(triggerConfig);
      if (mapping) codes.add(mapping.clientCode);
    }
    const extra = this.tenantClients[tenantSlug];
    for (const code of Array.isArray(extra) ? extra : extra ? [extra] : []) {
      if (typeof code === 'string' && /^[a-z0-9_-]{1,80}$/.test(code)) codes.add(code);
    }
    return [...codes];
  }

  /** Météo d'un client telle que Tickflow la publie pour un affichage client. Mise en cache 60 s ; null si indisponible. */
  async getClientWeather(clientCode: string): Promise<TickflowClientWeather | null> {
    if (!this.enabled) return null;
    const cached = this.weatherCache.get(clientCode);
    if (cached && cached.at > Date.now() - 60000) return cached.value;
    try {
      const response = await fetch(`${this.url}/clients/${encodeURIComponent(clientCode)}/weather`, {
        headers: { Authorization: `Bearer ${this.token}` },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        this.logger.warn(`Tickflow météo ${clientCode} → HTTP ${response.status}`);
        return cached?.value ?? null;
      }
      const value = (await response.json()) as TickflowClientWeather;
      this.weatherCache.set(clientCode, { at: Date.now(), value });
      return value;
    } catch (error) {
      this.logger.warn(`Tickflow météo injoignable : ${error instanceof Error ? error.message : String(error)}`);
      return cached?.value ?? null;
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
