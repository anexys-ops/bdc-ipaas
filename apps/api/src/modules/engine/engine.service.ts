import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import * as readline from 'readline';
import { Readable } from 'stream';
import { Client as FtpClient } from 'basic-ftp';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { PrismaClient } from '../../generated/tenant';
import { VaultService } from '../vault/vault.service';
import { ConnectorRegistryService } from '../connectors/connector-registry.service';
import { TenantDatabaseService } from '../tenants/tenant-database.service';
import { TenantsService } from '../tenants/tenants.service';
import { FileIoService } from './file-io.service';
import { BenthosService } from './benthos.service';

export interface ExecutionResult {
  executionId: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED';
  recordsIn: number;
  recordsOut: number;
  recordsFailed: number;
  errorMessage?: string;
  startedAt?: Date;
  finishedAt?: Date | null;
}

/**
 * Service d'exécution des flux d'intégration.
 */
@Injectable()
export class EngineService {
  private readonly logger = new Logger(EngineService.name);
  private flowQueue: Queue | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly vaultService: VaultService,
    private readonly connectorRegistryService: ConnectorRegistryService,
    private readonly tenantDbService: TenantDatabaseService,
    private readonly tenantsService: TenantsService,
    private readonly fileIoService: FileIoService,
    private readonly benthosService: BenthosService,
  ) {
    this.initQueue();
  }

  /**
   * Initialise la queue BullMQ.
   */
  private initQueue(): void {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      try {
        const url = new URL(redisUrl);
        this.flowQueue = new Queue('flow-executions', {
          connection: {
            host: url.hostname,
            port: parseInt(url.port) || 6379,
          },
        });
        this.logger.log('Queue BullMQ initialisée');
      } catch (error) {
        this.logger.warn('Redis non disponible, exécution synchrone uniquement');
      }
    }
  }

  private async getTenantClient(tenantId: string): Promise<PrismaClient> {
    const tenant = await this.tenantsService.getTenantWithHash(tenantId);
    return this.tenantDbService.getClient(tenantId, tenant.dbConnectionHash);
  }

  /**
   * Lance l'exécution d'un flux.
   */
  async executeFlow(
    tenantId: string,
    flowId: string,
    options: {
      isDryRun?: boolean;
      triggerSource?: string;
      ingestionToken?: string;
      clientName?: string;
    } = {},
  ): Promise<ExecutionResult> {
    const prisma = await this.getTenantClient(tenantId);

    const flow = await prisma.flow.findUnique({
      where: { id: flowId },
      include: {
        sourceConnector: true,
        destinations: {
          include: { connector: true, mapping: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!flow) {
      throw new NotFoundException(`Flux non trouvé: ${flowId}`);
    }

    if (!flow.isActive && !options.isDryRun) {
      throw new BadRequestException('Le flux n\'est pas actif');
    }
    this.validateIngestionContext(flow.triggerConfig, options.ingestionToken, options.clientName);

    const execution = await prisma.flowExecution.create({
      data: {
        flowId,
        environment: flow.environment,
        triggerSource: options.triggerSource || 'MANUAL',
        isDryRun: options.isDryRun || false,
        status: 'PENDING',
      },
    });

    if (this.flowQueue) {
      await this.flowQueue.add(
        'execute',
        {
          tenantId,
          executionId: execution.id,
          flowId,
          isDryRun: options.isDryRun,
          ingestionToken: options.ingestionToken,
          clientName: options.clientName,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      );
      this.logger.log(`Job ajouté à la queue: ${execution.id}`);
    } else {
      this.processExecution(
        tenantId,
        execution.id,
        flowId,
        options.isDryRun || false,
        options.ingestionToken,
        options.clientName,
      );
    }

    return {
      executionId: execution.id,
      status: 'PENDING',
      recordsIn: 0,
      recordsOut: 0,
      recordsFailed: 0,
    };
  }

  /**
   * Traite une exécution de flux (appelé par le worker ou directement).
   */
  async processExecution(
    tenantId: string,
    executionId: string,
    flowId: string,
    isDryRun: boolean,
    ingestionToken?: string,
    clientName?: string,
  ): Promise<void> {
    const prisma = await this.getTenantClient(tenantId);

    await prisma.flowExecution.update({
      where: { id: executionId },
      data: { status: 'RUNNING' },
    });

    try {
      const flow = await prisma.flow.findUnique({
        where: { id: flowId },
        include: {
          sourceConnector: true,
          destinations: {
            include: { connector: true, mapping: true },
            where: { isActive: true },
            orderBy: { orderIndex: 'asc' },
          },
        },
      });

      if (!flow) {
        throw new Error('Flux non trouvé');
      }
      this.validateIngestionContext(flow.triggerConfig, ingestionToken, clientName);

      await this.logExecution(prisma, executionId, 'INFO', 'Démarrage de l\'exécution');

      const triggerConfig = flow.triggerConfig as Record<string, unknown>;
      const records = await this.extractSourceRecords(flow.triggerType, triggerConfig, executionId, prisma);
      const recordsIn = records.length;
      let recordsOut = 0;
      let recordsFailed = 0;

      await this.logExecution(prisma, executionId, 'INFO', `${recordsIn} records extraits`);

      for (const destination of flow.destinations) {
        try {
          const transformed = this.benthosService.transformRecords(
            records,
            (destination.mapping?.rules as Array<Record<string, unknown>> | null) ?? null,
          );
          if (!isDryRun) {
            const deliveryResult = this.isFilePipeline(triggerConfig)
              ? await this.deliverToFileDestination(
                  flow.id,
                  executionId,
                  triggerConfig,
                  destination.connector.name,
                  transformed,
                )
              : await this.deliverToDestination(
                  destination.connector.type,
                  destination.connector.configHash,
                  destination.mapping?.destinationOperationId ?? null,
                  transformed,
                );
            const delivered = typeof deliveryResult === 'number' ? deliveryResult : deliveryResult.delivered;
            recordsOut += delivered;
            recordsFailed += transformed.length - delivered;
            if (typeof deliveryResult !== 'number') {
              await this.logExecution(
                prisma,
                executionId,
                'INFO',
                `Fichier de sortie généré: ${deliveryResult.outputPath}`,
                { outputPath: deliveryResult.outputPath },
              );
            }
          }
          await this.logExecution(
            prisma,
            executionId,
            'INFO',
            `Destination ${destination.connector.name}: ${transformed.length} records traités`,
          );
        } catch (destError) {
          recordsFailed += recordsIn;
          const errorMsg = destError instanceof Error ? destError.message : String(destError);
          await this.logExecution(
            prisma,
            executionId,
            'ERROR',
            `Erreur destination ${destination.connector.name}: ${errorMsg}`,
          );
        }
      }

      const finalStatus = recordsFailed > 0 
        ? (recordsOut > 0 ? 'PARTIAL' : 'FAILED')
        : (isDryRun ? 'DRY_RUN_OK' : 'SUCCESS');

      await prisma.flowExecution.update({
        where: { id: executionId },
        data: {
          status: finalStatus,
          recordsIn,
          recordsOut,
          recordsFailed,
          finishedAt: new Date(),
        },
      });

      await this.logExecution(
        prisma,
        executionId,
        'INFO',
        `Exécution terminée: ${finalStatus} (${recordsIn} in, ${recordsOut} out, ${recordsFailed} failed)`,
      );

      this.logger.log(`Exécution ${executionId} terminée: ${finalStatus}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      await prisma.flowExecution.update({
        where: { id: executionId },
        data: {
          status: 'FAILED',
          errorMessage,
          finishedAt: new Date(),
        },
      });

      await this.logExecution(prisma, executionId, 'ERROR', `Erreur fatale: ${errorMessage}`);

      this.logger.error(`Exécution ${executionId} échouée: ${errorMessage}`);
    }
  }

  private validateIngestionContext(
    triggerConfigUnknown: unknown,
    ingestionToken?: string,
    clientName?: string,
  ): void {
    const triggerConfig = (triggerConfigUnknown ?? {}) as Record<string, unknown>;
    const expectedToken = triggerConfig.ingestionToken as string | undefined;
    if (expectedToken && ingestionToken !== expectedToken) {
      throw new BadRequestException('Token d\'ingestion invalide');
    }
    const expectedClientName = triggerConfig.clientName as string | undefined;
    if (expectedClientName && clientName && expectedClientName !== clientName) {
      throw new BadRequestException('Nom client incohérent pour ce flux');
    }
  }

  private async extractSourceRecords(
    triggerType: string,
    triggerConfig: Record<string, unknown>,
    executionId: string,
    prisma: PrismaClient,
  ): Promise<Array<Record<string, unknown>>> {
    if (triggerType !== 'FILE_WATCH' && triggerType !== 'AGENT_WATCH' && triggerType !== 'FILE_ONLY') {
      return [];
    }
    const filePath =
      (triggerConfig.inputPath as string | undefined) ?? (triggerConfig.filePath as string | undefined);
    if (!filePath) {
      throw new BadRequestException(
        'triggerConfig.inputPath (ou filePath) est requis pour FILE_WATCH/AGENT_WATCH/FILE_ONLY',
      );
    }
    const parser = (triggerConfig.parser ?? {}) as Record<string, unknown>;
    const fileStats = await stat(filePath);
    const maxFileSizeMb = Number(parser.maxFileSizeMb ?? 25);
    if (fileStats.size > maxFileSizeMb * 1024 * 1024) {
      throw new BadRequestException(`Fichier trop volumineux (>${maxFileSizeMb}MB)`);
    }
    const delimiter = String(parser.delimiter ?? ',');
    const hasHeader = parser.hasHeader !== false;
    const skipLines = Number(parser.skipLines ?? 0);
    const sampleLines = Number(parser.sampleLines ?? 0);
    const extension = filePath.toLowerCase().split('.').pop();
    const records =
      extension === 'csv'
        ? await this.parseCsvFile(filePath, delimiter, hasHeader, skipLines, sampleLines)
        : await this.fileIoService.readRecordsFromPath(filePath);
    await this.logExecution(
      prisma,
      executionId,
      'INFO',
      'Parsing CSV terminé',
      { filePath, delimiter, hasHeader, skipLines, sampleLines },
    );
    return records;
  }

  private async parseCsvFile(
    filePath: string,
    delimiter: string,
    hasHeader: boolean,
    skipLines: number,
    sampleLines: number,
  ): Promise<Array<Record<string, unknown>>> {
    const stream = createReadStream(filePath, { encoding: 'utf-8' });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    const records: Array<Record<string, unknown>> = [];
    let headers: string[] = [];
    let lineIndex = -1;
    for await (const line of rl) {
      lineIndex += 1;
      if (lineIndex < skipLines) {
        continue;
      }
      if (!line.trim()) {
        continue;
      }
      const cells = line.split(delimiter).map((cell) => cell.trim());
      if (hasHeader && headers.length === 0) {
        headers = cells.map((cell, idx) => cell || `col_${idx + 1}`);
        continue;
      }
      const fallbackHeaders = headers.length > 0 ? headers : cells.map((_, idx) => `col_${idx + 1}`);
      const record: Record<string, unknown> = {};
      for (let i = 0; i < cells.length; i += 1) {
        record[fallbackHeaders[i] ?? `col_${i + 1}`] = cells[i];
      }
      records.push(record);
      if (sampleLines > 0 && records.length >= sampleLines) {
        break;
      }
    }
    return records;
  }

  /** Pipeline fichier local (simulation Benthos) uniquement si entrée ET sortie disque sont définies. */
  private isFilePipeline(triggerConfig: Record<string, unknown>): boolean {
    const inPath = typeof triggerConfig.inputPath === 'string' && triggerConfig.inputPath.trim().length > 0;
    const outPath =
      typeof triggerConfig.outputPath === 'string' && triggerConfig.outputPath.trim().length > 0;
    return inPath && outPath;
  }

  private async deliverToFileDestination(
    flowId: string,
    executionId: string,
    triggerConfig: Record<string, unknown>,
    destinationConnectorName: string,
    records: Array<Record<string, unknown>>,
  ): Promise<{ delivered: number; outputPath: string }> {
    if (records.length === 0) {
      return { delivered: 0, outputPath: '' };
    }
    const outputPathRaw = triggerConfig.outputPath as string | undefined;
    if (!outputPathRaw) {
      throw new BadRequestException('triggerConfig.outputPath est requis pour un flux fichier');
    }
    const outputFormat = (triggerConfig.outputFormat as string | undefined) ?? 'json';
    const outputPath = this.buildOutputPath(outputPathRaw, executionId, destinationConnectorName);
    const benthosConfig = this.benthosService.buildPipelineConfig({
      flowId,
      executionId,
      inputPath: String(triggerConfig.inputPath ?? ''),
      outputPath,
      outputFormat,
    });
    this.logger.debug(`Pipeline Benthos simulé: ${JSON.stringify(benthosConfig)}`);
    await this.fileIoService.writeRecordsToPath(outputPath, records, outputFormat);
    return { delivered: records.length, outputPath };
  }

  private buildOutputPath(baseOutputPath: string, executionId: string, connectorName: string): string {
    const sanitizedConnector = connectorName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (baseOutputPath.includes('{executionId}')) {
      return baseOutputPath
        .replaceAll('{executionId}', executionId)
        .replaceAll('{destination}', sanitizedConnector);
    }
    const timestamp = Date.now();
    const segments = baseOutputPath.split('/');
    const leaf = segments.pop() ?? 'output.json';
    const dotIndex = leaf.lastIndexOf('.');
    const baseName = dotIndex > 0 ? leaf.slice(0, dotIndex) : leaf;
    const ext = dotIndex > 0 ? leaf.slice(dotIndex) : '.json';
    return [...segments, `${baseName}-${sanitizedConnector}-${timestamp}${ext}`].join('/');
  }

  private async deliverToDestination(
    connectorType: string,
    configHash: string,
    operationId: string | null,
    records: Array<Record<string, unknown>>,
  ): Promise<number> {
    if (records.length === 0) {
      return 0;
    }
    const connectorDef = this.connectorRegistryService.getById(connectorType);
    if (!connectorDef) {
      throw new BadRequestException(`Définition connecteur introuvable: ${connectorType}`);
    }
    const destinationOperation = operationId
      ? connectorDef.operations.find((op) => op.id === operationId && op.type === 'destination')
      : connectorDef.operations.find((op) => {
          if (op.type !== 'destination') return false;
          const m = (op.method || '').toUpperCase();
          if (m === 'FILE_WRITE') return true;
          return !!op.path && ['POST', 'PUT', 'PATCH'].includes(m);
        });
    if (!destinationOperation) {
      throw new BadRequestException(`Aucune opération destination pour ${connectorType}`);
    }

    const config = this.vaultService.decryptObject<Record<string, unknown>>(configHash);
    const destMethod = (destinationOperation.method || '').toUpperCase();

    if (destMethod === 'FILE_WRITE') {
      const csvPayload = this.fileIoService.serializeRecords(records, 'csv');
      await this.uploadFileTransportPayload(config, csvPayload);
      return records.length;
    }

    if (!destinationOperation.path) {
      throw new BadRequestException(
        `Aucune opération destination HTTP exploitable pour ${connectorType}`,
      );
    }
    const baseUrlRaw =
      (config.base_url as string | undefined) ?? (config.shop_url as string | undefined);
    if (!baseUrlRaw) {
      throw new BadRequestException(`base_url manquante pour ${connectorType}`);
    }
    const url = `${baseUrlRaw.replace(/\/$/, '')}/${destinationOperation.path.replace(/^\//, '')}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const authType = connectorDef.connector_meta.auth_type;
    if (authType === 'api_key') {
      const headerName = connectorDef.auth_config.api_key_header ?? 'X-API-Key';
      const apiKey = config.api_key as string | undefined;
      if (apiKey) {
        headers[headerName] = apiKey;
      }
    }
    if (authType === 'oauth2') {
      const accessToken = config.access_token as string | undefined;
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }
    }
    if (authType === 'basic') {
      const username = String(config.username ?? '');
      const password = String(config.password ?? '');
      headers.Authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    }
    let delivered = 0;
    for (const record of records) {
      const response = await fetch(url, {
        method: destinationOperation.method,
        headers,
        body: JSON.stringify(record),
      });
      if (response.ok) {
        delivered += 1;
      }
    }
    return delivered;
  }

  /**
   * Envoi FTP (upload) — un fichier CSV agrégé. SFTP non implémenté ici.
   */
  private async uploadFileTransportPayload(
    config: Record<string, unknown>,
    fileContent: string,
  ): Promise<void> {
    const baseUrlRaw = String(
      (config.base_url as string | undefined) ?? (config.shop_url as string | undefined) ?? '',
    ).trim();
    if (!baseUrlRaw) {
      throw new BadRequestException('base_url manquante pour le dépôt fichier');
    }
    const withScheme = baseUrlRaw.includes('://') ? baseUrlRaw : `ftp://${baseUrlRaw}`;
    let u: URL;
    try {
      u = new URL(withScheme);
    } catch {
      throw new BadRequestException(`URL de transport invalide: ${baseUrlRaw}`);
    }
    const protocol = u.protocol.replace(':', '').toLowerCase();
    const uploadDir = String(config.upload_path ?? '').trim().replace(/\/+$/, '');
    const fileName = `export-${Date.now()}.csv`;
    const remotePath =
      !uploadDir || uploadDir === '/' ? fileName : `${uploadDir.replace(/^\//, '')}/${fileName}`;

    if (protocol === 'sftp') {
      throw new BadRequestException(
        'Le dépôt SFTP depuis le moteur n’est pas encore pris en charge ; utilisez ftp:// ou un agent.',
      );
    }
    if (protocol !== 'ftp') {
      throw new BadRequestException(`Protocole non supporté pour l’upload fichier: ${protocol}`);
    }

    const client = new FtpClient();
    try {
      await client.access({
        host: u.hostname,
        port: u.port ? parseInt(u.port, 10) : 21,
        user: String(config.username ?? ''),
        password: String(config.password ?? ''),
        secure: false,
      });
      await client.uploadFrom(Readable.from(Buffer.from(fileContent, 'utf-8')), remotePath);
    } finally {
      client.close();
    }
  }

  /**
   * Ajoute un log d'exécution.
   */
  private async logExecution(
    prisma: PrismaClient,
    executionId: string,
    level: 'INFO' | 'WARN' | 'ERROR',
    message: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    await prisma.executionLog.create({
      data: {
        executionId,
        level,
        message,
        data: data as object | undefined,
      },
    });
  }

  /**
   * Récupère le statut d'une exécution.
   */
  async getExecutionStatus(tenantId: string, executionId: string): Promise<ExecutionResult> {
    const prisma = await this.getTenantClient(tenantId);

    const execution = await prisma.flowExecution.findUnique({
      where: { id: executionId },
    });

    if (!execution) {
      throw new NotFoundException(`Exécution non trouvée: ${executionId}`);
    }

    return {
      executionId: execution.id,
      status: execution.status as ExecutionResult['status'],
      recordsIn: execution.recordsIn,
      recordsOut: execution.recordsOut,
      recordsFailed: execution.recordsFailed,
      errorMessage: execution.errorMessage || undefined,
      startedAt: execution.startedAt,
      finishedAt: execution.finishedAt ?? undefined,
    };
  }

  /**
   * Récupère les logs d'une exécution.
   */
  async getExecutionLogs(
    tenantId: string,
    executionId: string,
  ): Promise<Array<{ level: string; message: string; createdAt: Date; data?: Record<string, unknown> }>> {
    const prisma = await this.getTenantClient(tenantId);

    const logs = await prisma.executionLog.findMany({
      where: { executionId },
      orderBy: { createdAt: 'asc' },
    });

    return logs.map((l) => ({
      level: l.level,
      message: l.message,
      createdAt: l.createdAt,
      data: (l.data as Record<string, unknown> | null) ?? undefined,
    }));
  }

  /**
   * Récupère le statut des queues BullMQ (active, waiting, failed, completed).
   */
  async getQueueStats(): Promise<{
    flowExecutions: { active: number; waiting: number; failed: number; completed: number } | null;
  }> {
    if (!this.flowQueue) {
      return { flowExecutions: null };
    }
    try {
      const counts = await this.flowQueue.getJobCounts();
      return {
        flowExecutions: {
          active: counts.active ?? 0,
          waiting: counts.waiting ?? 0,
          failed: counts.failed ?? 0,
          completed: counts.completed ?? 0,
        },
      };
    } catch (error) {
      this.logger.warn(`Impossible de récupérer les stats des queues: ${error}`);
      return { flowExecutions: null };
    }
  }

  /**
   * Aperçu des jobs récents sur la queue flow-executions (BullMQ / Redis).
   */
  async getFlowQueueJobsPreview(limit = 24): Promise<
    Array<{
      id: string;
      name: string;
      state: string;
      progress: number;
      timestamp: number;
      failedReason?: string;
    }>
  > {
    if (!this.flowQueue) {
      return [];
    }
    const safeLimit = Math.min(100, Math.max(1, limit));
    try {
      const jobs = await this.flowQueue.getJobs(
        ['waiting', 'delayed', 'active', 'failed', 'completed'],
        0,
        safeLimit - 1,
      );
      const rows: Array<{
        id: string;
        name: string;
        state: string;
        progress: number;
        timestamp: number;
        failedReason?: string;
      }> = [];
      for (const job of jobs) {
        const state = await job.getState();
        const progress =
          typeof job.progress === 'number' ? job.progress : typeof job.progress === 'object' ? 0 : 0;
        rows.push({
          id: String(job.id),
          name: job.name ?? 'flow-execution',
          state,
          progress,
          timestamp: job.timestamp,
          failedReason: job.failedReason ?? undefined,
        });
      }
      rows.sort((a, b) => b.timestamp - a.timestamp);
      return rows.slice(0, safeLimit);
    } catch (error) {
      this.logger.warn(`Aperçu queue jobs: ${error}`);
      return [];
    }
  }

  /**
   * Récupère l'historique des exécutions d'un flux.
   */
  async getFlowExecutions(
    tenantId: string,
    flowId: string,
    limit: number = 20,
  ): Promise<ExecutionResult[]> {
    const prisma = await this.getTenantClient(tenantId);

    const executions = await prisma.flowExecution.findMany({
      where: { flowId },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });

    return executions.map((e) => ({
      executionId: e.id,
      status: e.status as ExecutionResult['status'],
      recordsIn: e.recordsIn,
      recordsOut: e.recordsOut,
      recordsFailed: e.recordsFailed,
      errorMessage: e.errorMessage || undefined,
      startedAt: e.startedAt,
      finishedAt: e.finishedAt ?? undefined,
    }));
  }
}
