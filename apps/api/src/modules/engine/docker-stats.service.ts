import { Injectable, Logger } from '@nestjs/common';
import * as http from 'http';

export interface ContainerStat {
  name: string;
  id: string;
  status: 'running' | 'exited' | 'unknown';
  cpuPercent: number;
  memUsageMb: number;
  memLimitMb: number;
  memPercent: number;
}

const TARGETS = [
  'anexys-api',
  'anexys-postgres',
  'anexys-redis',
  'anexys-benthos',
  'anexys-worker',
];

/** Labels courts pour la UI (correspond à l'ordre des chips du strip) */
const LABEL_MAP: Record<string, string> = {
  'anexys-api': 'API',
  'anexys-postgres': 'Postgres',
  'anexys-redis': 'Redis',
  'anexys-benthos': 'Benthos',
  'anexys-worker': 'Worker',
};

@Injectable()
export class DockerStatsService {
  private readonly logger = new Logger(DockerStatsService.name);

  /** Retourne [] si le socket n'est pas accessible */
  async getStats(): Promise<ContainerStat[]> {
    try {
      const containers = await this.socketGet<any[]>('/containers/json?all=false');
      const targets = containers.filter((c) =>
        (c.Names as string[])?.some((n) => TARGETS.includes(n.replace(/^\//, ''))),
      );

      const stats = await Promise.all(targets.map((c) => this.fetchContainerStat(c)));
      // Trier selon l'ordre TARGETS pour cohérence avec les chips
      stats.sort((a, b) => TARGETS.indexOf(a.name) - TARGETS.indexOf(b.name));
      return stats;
    } catch (err) {
      this.logger.warn(`DockerStats: ${err instanceof Error ? err.message : err}`);
      return [];
    }
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  private socketGet<T>(path: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const req = http.get(
        {
          socketPath: '/var/run/docker.sock',
          path,
          headers: { Host: 'localhost' },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
          res.on('end', () => {
            try {
              resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
            } catch {
              reject(new Error('Docker socket: invalid JSON'));
            }
          });
        },
      );
      req.on('error', reject);
      req.setTimeout(6_000, () => {
        req.destroy(new Error('Docker socket timeout'));
      });
    });
  }

  private async fetchContainerStat(container: any): Promise<ContainerStat> {
    const rawName = (container.Names?.[0] as string | undefined)?.replace(/^\//, '') ?? '';
    const name = rawName;
    const id: string = container.Id;

    try {
      const stats = await this.socketGet<any>(`/containers/${id}/stats?stream=false`);

      // CPU
      const cpuDelta =
        (stats.cpu_stats?.cpu_usage?.total_usage ?? 0) -
        (stats.precpu_stats?.cpu_usage?.total_usage ?? 0);
      const systemDelta =
        (stats.cpu_stats?.system_cpu_usage ?? 0) -
        (stats.precpu_stats?.system_cpu_usage ?? 0);
      const numCPUs: number =
        stats.cpu_stats?.online_cpus ??
        stats.cpu_stats?.cpu_usage?.percpu_usage?.length ??
        1;
      const cpuPercent =
        systemDelta > 0 ? Math.round(((cpuDelta / systemDelta) * numCPUs * 100) * 100) / 100 : 0;

      // Mémoire
      const memUsage: number = stats.memory_stats?.usage ?? 0;
      const memLimit: number = stats.memory_stats?.limit ?? 1;
      // Soustrait le cache page (Linux)
      const memCache: number =
        stats.memory_stats?.stats?.cache ??
        stats.memory_stats?.stats?.inactive_file ??
        0;
      const memActual = Math.max(0, memUsage - memCache);
      const memUsageMb = Math.round(memActual / 1_048_576);
      const memLimitMb = Math.round(memLimit / 1_048_576);
      const memPercent = memLimit > 0 ? Math.round((memActual / memLimit) * 1000) / 10 : 0;

      return { name, id, status: 'running', cpuPercent, memUsageMb, memLimitMb, memPercent };
    } catch (err) {
      this.logger.warn(`Stat container ${name}: ${err instanceof Error ? err.message : err}`);
      return { name, id, status: 'unknown', cpuPercent: 0, memUsageMb: 0, memLimitMb: 0, memPercent: 0 };
    }
  }
}

export { LABEL_MAP };
