import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import * as crypto from 'crypto';
import { AgentsService } from './agents.service';

interface AgentMessage {
  type: string;
  token?: string;
  filename?: string;
  size?: number;
  chunkIndex?: number;
  data?: string;
  checksum?: string;
}

interface ConnectedAgent {
  socket: Socket;
  tenantId: string;
  agentId: string;
  authenticated: boolean;
  authTimer?: NodeJS.Timeout;
  /** Vérification du jeton de handshake en cours. */
  pending?: Promise<void>;
}

interface FileBuffer {
  chunks: Buffer[];
  received: number;
  declared: number;
  idleTimer: NodeJS.Timeout;
}

/** Taille maximale d'un fichier reçu (octets). Défaut : 50 Mo. Lue à l'exécution (après chargement du .env). */
const maxFileSize = (): number => Number(process.env.AGENT_MAX_FILE_SIZE) || 50 * 1024 * 1024;
/** Durée maximale sans chunk avant abandon d'un fichier en cours. */
const FILE_IDLE_TIMEOUT_MS = 60_000;
/** Nombre maximal de fichiers en cours de réception par agent. */
const MAX_CONCURRENT_FILES = 5;
/** Délai laissé à un client sans jeton de handshake pour envoyer 'auth'. */
const AUTH_TIMEOUT_MS = 10_000;

/**
 * Origines navigateur autorisées (AGENT_CORS_ORIGINS, liste séparée par des virgules, sinon FRONTEND_URL).
 * Évaluées à chaque requête pour tenir compte du .env chargé par ConfigModule.
 * Les agents Node n'envoient pas d'en-tête Origin : ils ne sont pas concernés.
 */
const corsOrigin = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void): void => {
  const allowed = (process.env.AGENT_CORS_ORIGINS ?? process.env.FRONTEND_URL ?? 'http://localhost:5173')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);
  callback(null, !origin || allowed.includes(origin));
};

@WebSocketGateway({
  namespace: '/agent',
  // Attention : cors et maxHttpBufferSize s'appliquent au serveur socket.io partagé par toutes les gateways.
  cors: { origin: corsOrigin, credentials: true },
  // Un chunk de 64 Ko encodé en base64 fait ~88 Ko : 1 Mo laisse de la marge.
  maxHttpBufferSize: 1024 * 1024,
})
export class AgentsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(AgentsGateway.name);
  private agents: Map<string, ConnectedAgent> = new Map();
  private fileBuffers: Map<string, FileBuffer> = new Map();

  constructor(private readonly agentsService: AgentsService) {}

  async handleConnection(client: Socket): Promise<void> {
    const agent: ConnectedAgent = { socket: client, tenantId: '', agentId: '', authenticated: false };
    this.agents.set(client.id, agent);

    const auth = client.handshake.auth as { token?: unknown } | undefined;
    const handshakeToken = typeof auth?.token === 'string' ? auth.token : undefined;

    // Sans jeton de handshake, l'agent doit envoyer 'auth' avant l'expiration du délai (compatibilité).
    // Le délai couvre aussi une vérification de handshake bloquée (base injoignable).
    agent.authTimer = setTimeout(() => {
      if (!agent.authenticated) this.reject(client, 'Authentification requise');
    }, AUTH_TIMEOUT_MS);

    if (handshakeToken) {
      agent.pending = this.authenticate(client, handshakeToken);
      await agent.pending;
    }
  }

  handleDisconnect(client: Socket): void {
    const agent = this.agents.get(client.id);
    if (agent?.authTimer) clearTimeout(agent.authTimer);
    if (agent?.authenticated) {
      this.logger.log(`Agent déconnecté: ${agent.agentId}`);
    }
    this.agents.delete(client.id);
    for (const key of [...this.fileBuffers.keys()]) {
      if (key.startsWith(`${client.id}:`)) this.dropFile(key);
    }
  }

  @SubscribeMessage('auth')
  async handleAuth(@ConnectedSocket() client: Socket, @MessageBody() message: AgentMessage): Promise<void> {
    const agent = this.agents.get(client.id);
    await agent?.pending;
    if (agent?.authenticated) {
      client.emit('message', { type: 'auth_ok', agentId: agent.agentId, tenantId: agent.tenantId });
      return;
    }
    if (!agent) return;
    if (typeof message?.token !== 'string' || !message.token) {
      this.reject(client, 'Token manquant');
      return;
    }
    agent.pending = this.authenticate(client, message.token);
    await agent.pending;
  }

  private async authenticate(client: Socket, token: string): Promise<void> {
    const agent = this.agents.get(client.id);
    if (!agent) return;

    let result: { tenantId: string; agentId: string } | null = null;
    try {
      result = await this.agentsService.authenticateToken(token);
    } catch (err) {
      this.logger.error(`Erreur de vérification du jeton agent: ${(err as Error).message}`);
    }

    if (!result) {
      this.logger.warn(`Connexion agent refusée: ${client.id} (${client.handshake.address})`);
      this.reject(client, 'Token invalide');
      return;
    }

    // Un seul socket par agent : l'ancienne connexion est fermée.
    for (const [id, other] of this.agents) {
      if (id !== client.id && other.authenticated && other.agentId === result.agentId) {
        other.socket.emit('message', { type: 'auth_error', message: 'Nouvelle connexion du même agent' });
        other.socket.disconnect(true);
      }
    }

    if (agent.authTimer) clearTimeout(agent.authTimer);
    agent.authenticated = true;
    agent.agentId = result.agentId;
    agent.tenantId = result.tenantId;
    client.emit('message', { type: 'auth_ok', agentId: agent.agentId, tenantId: agent.tenantId });
    this.logger.log(`Agent authentifié: ${agent.agentId} (tenant ${agent.tenantId})`);
  }

  private reject(client: Socket, reason: string): void {
    client.emit('message', { type: 'auth_error', message: reason });
    client.disconnect(true);
  }

  /** Déconnecte un agent révoqué ou supprimé. */
  disconnectAgent(tenantId: string, agentId: string): void {
    for (const agent of this.agents.values()) {
      if (agent.authenticated && agent.tenantId === tenantId && agent.agentId === agentId) {
        this.reject(agent.socket, 'Agent révoqué');
      }
    }
  }

  private dropFile(key: string): void {
    const file = this.fileBuffers.get(key);
    if (file) clearTimeout(file.idleTimer);
    this.fileBuffers.delete(key);
  }

  private armIdleTimer(client: Socket, key: string, filename: string): NodeJS.Timeout {
    return setTimeout(
      () => this.fileError(client, key, filename, 'Réception interrompue (délai dépassé)'),
      FILE_IDLE_TIMEOUT_MS,
    );
  }

  private fileError(client: Socket, key: string, filename: string | undefined, reason: string): void {
    this.dropFile(key);
    client.emit('message', { type: 'error', filename, message: reason });
  }

  @SubscribeMessage('file_start')
  async handleFileStart(@ConnectedSocket() client: Socket, @MessageBody() message: AgentMessage): Promise<void> {
    const agent = this.agents.get(client.id);
    await agent?.pending;
    if (!agent?.authenticated) {
      this.reject(client, 'Non authentifié');
      return;
    }
    if (typeof message?.filename !== 'string' || !message.filename) {
      client.emit('message', { type: 'error', message: 'Nom de fichier manquant' });
      return;
    }

    const key = `${client.id}:${message.filename}`;
    const declared = Number(message.size);
    const max = maxFileSize();
    if (!Number.isFinite(declared) || declared < 0 || declared > max) {
      this.fileError(client, key, message.filename, `Fichier trop volumineux (max ${max} octets)`);
      return;
    }

    const inProgress = [...this.fileBuffers.keys()].filter(k => k.startsWith(`${client.id}:`) && k !== key).length;
    if (inProgress >= MAX_CONCURRENT_FILES) {
      client.emit('message', { type: 'error', filename: message.filename, message: 'Trop de fichiers en cours' });
      return;
    }

    this.dropFile(key);
    this.fileBuffers.set(key, {
      chunks: [],
      received: 0,
      declared,
      idleTimer: this.armIdleTimer(client, key, message.filename),
    });
    this.logger.log(`Réception fichier démarrée: ${message.filename} (${declared} bytes)`);
  }

  @SubscribeMessage('file_chunk')
  async handleFileChunk(@ConnectedSocket() client: Socket, @MessageBody() message: AgentMessage): Promise<void> {
    const agent = this.agents.get(client.id);
    await agent?.pending;
    if (!agent?.authenticated) {
      this.reject(client, 'Non authentifié');
      return;
    }
    if (typeof message?.filename !== 'string' || typeof message.data !== 'string') return;
    const key = `${client.id}:${message.filename}`;
    const file = this.fileBuffers.get(key);
    if (!file) return;

    const chunk = Buffer.from(message.data, 'base64');
    file.received += chunk.length;
    if (file.received > file.declared || file.received > maxFileSize()) {
      this.fileError(client, key, message.filename, 'Taille de fichier dépassée');
      return;
    }
    file.chunks.push(chunk);
    clearTimeout(file.idleTimer);
    file.idleTimer = this.armIdleTimer(client, key, message.filename);
  }

  @SubscribeMessage('file_end')
  async handleFileEnd(@ConnectedSocket() client: Socket, @MessageBody() message: AgentMessage): Promise<void> {
    const agent = this.agents.get(client.id);
    await agent?.pending;
    if (!agent?.authenticated) {
      this.reject(client, 'Non authentifié');
      return;
    }
    if (typeof message?.filename !== 'string') return;
    const key = `${client.id}:${message.filename}`;
    const file = this.fileBuffers.get(key);
    if (!file) return;
    this.dropFile(key);

    if (file.received !== file.declared) {
      client.emit('message', { type: 'error', filename: message.filename, message: 'Fichier incomplet' });
      return;
    }

    const fileData = Buffer.concat(file.chunks);
    const checksum = crypto.createHash('sha256').update(fileData).digest('hex');

    if (message.checksum && message.checksum !== checksum) {
      client.emit('message', { type: 'error', filename: message.filename, message: 'Checksum invalide' });
      return;
    }

    this.logger.log(`Fichier reçu: ${message.filename} (${fileData.length} bytes)`);
    client.emit('message', { type: 'ack', filename: message.filename, executionId: `exec-${Date.now()}` });
  }

  @SubscribeMessage('heartbeat')
  handleHeartbeat(@ConnectedSocket() client: Socket): void {
    if (!this.agents.get(client.id)?.authenticated) return;
    client.emit('message', { type: 'heartbeat_ack', timestamp: Date.now() });
  }

  /**
   * Envoie un fichier à un agent spécifique.
   */
  async sendFileToAgent(agentId: string, filename: string, data: Buffer): Promise<boolean> {
    for (const [, agent] of this.agents) {
      if (agent.agentId === agentId && agent.authenticated) {
        const chunkSize = 64 * 1024; // 64KB chunks
        agent.socket.emit('message', { type: 'file_receive_start', filename, size: data.length });

        for (let i = 0; i < data.length; i += chunkSize) {
          const chunk = data.subarray(i, i + chunkSize);
          agent.socket.emit('message', { type: 'file_receive_chunk', data: chunk.toString('base64') });
        }

        agent.socket.emit('message', { type: 'file_receive_end', filename });
        return true;
      }
    }
    return false;
  }

  getConnectedAgents(): Array<{ agentId: string; tenantId: string }> {
    return Array.from(this.agents.values())
      .filter(a => a.authenticated)
      .map(a => ({ agentId: a.agentId, tenantId: a.tenantId }));
  }
}
