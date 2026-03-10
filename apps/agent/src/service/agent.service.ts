import { io, Socket } from 'socket.io-client';
import chokidar from 'chokidar';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Logger } from 'winston';

export class AgentService {
  private socket: Socket | null = null;
  private watcher: ReturnType<typeof chokidar.watch> | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  constructor(
    private readonly serverUrl: string,
    private readonly token: string,
    private readonly watchPaths: string[],
    private readonly logger: Logger,
  ) {}

  async start(): Promise<void> {
    await this.connect();
    this.startWatching();
    this.startHeartbeat();
  }

  async stop(): Promise<void> {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.watcher) await this.watcher.close();
    if (this.socket) this.socket.disconnect();
    this.logger.info('Agent arrêté');
  }

  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(`${this.serverUrl}/agent`, { reconnection: true, reconnectionAttempts: this.maxReconnectAttempts });

      this.socket.on('connect', () => {
        this.logger.info('Connecté au serveur');
        this.reconnectAttempts = 0;
        this.authenticate();
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        this.logger.warn(`Déconnecté: ${reason}`);
      });

      this.socket.on('connect_error', (err) => {
        this.logger.error(`Erreur de connexion: ${err.message}`);
        this.reconnectAttempts++;
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error('Impossible de se connecter au serveur'));
        }
      });

      this.socket.on('message', (msg) => this.handleMessage(msg));

      setTimeout(() => reject(new Error('Timeout de connexion')), 30000);
    });
  }

  private authenticate(): void {
    this.socket?.emit('auth', { type: 'auth', token: this.token });
    this.logger.info('Authentification envoyée');
  }

  private handleMessage(msg: { type: string; filename?: string; message?: string; executionId?: string }): void {
    switch (msg.type) {
      case 'auth_ok':
        this.logger.info('Authentification réussie');
        break;
      case 'auth_error':
        this.logger.error(`Erreur d'authentification: ${msg.message}`);
        break;
      case 'ack':
        this.logger.info(`Fichier traité: ${msg.filename}, execution: ${msg.executionId}`);
        break;
      case 'heartbeat_ack':
        // Heartbeat OK
        break;
      default:
        this.logger.debug(`Message reçu: ${JSON.stringify(msg)}`);
    }
  }

  private startWatching(): void {
    if (this.watchPaths.length === 0) {
      this.logger.warn('Aucun répertoire à surveiller');
      return;
    }

    const existingPaths = this.watchPaths.filter(p => fs.existsSync(p));
    if (existingPaths.length === 0) {
      this.logger.warn('Aucun répertoire existant parmi ceux configurés');
      return;
    }

    this.watcher = chokidar.watch(existingPaths, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 2000, pollInterval: 100 },
    });

    this.watcher.on('add', (filePath: string) => this.handleNewFile(filePath));
    this.watcher.on('error', (err: unknown) => this.logger.error(`Erreur de surveillance: ${err instanceof Error ? err.message : String(err)}`));

    this.logger.info(`Surveillance active sur: ${existingPaths.join(', ')}`);
  }

  private async handleNewFile(filePath: string): Promise<void> {
    try {
      this.logger.info(`Nouveau fichier détecté: ${filePath}`);
      const stats = fs.statSync(filePath);
      
      // Limite de taille: 100MB
      if (stats.size > 100 * 1024 * 1024) {
        this.logger.warn(`Fichier trop volumineux (${stats.size} bytes), ignoré`);
        return;
      }

      await this.sendFile(filePath);
    } catch (err) {
      this.logger.error(`Erreur lors du traitement du fichier: ${(err as Error).message}`);
    }
  }

  private async sendFile(filePath: string): Promise<void> {
    const filename = path.basename(filePath);
    const fileData = fs.readFileSync(filePath);
    const checksum = crypto.createHash('sha256').update(fileData).digest('hex');
    const chunkSize = 64 * 1024; // 64KB

    this.socket?.emit('file_start', { type: 'file_start', filename, size: fileData.length, checksum });

    for (let i = 0; i < fileData.length; i += chunkSize) {
      const chunk = fileData.subarray(i, i + chunkSize);
      this.socket?.emit('file_chunk', { type: 'file_chunk', filename, chunkIndex: Math.floor(i / chunkSize), data: chunk.toString('base64') });
    }

    this.socket?.emit('file_end', { type: 'file_end', filename, checksum });
    this.logger.info(`Fichier envoyé: ${filename} (${fileData.length} bytes)`);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.socket?.emit('heartbeat', { type: 'heartbeat' });
    }, 30000);
  }
}
