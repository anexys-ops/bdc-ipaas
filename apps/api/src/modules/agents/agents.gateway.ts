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
import { PrismaService } from '../../prisma/prisma.service';

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
}

@WebSocketGateway({ namespace: '/agent', cors: true })
export class AgentsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(AgentsGateway.name);
  private agents: Map<string, ConnectedAgent> = new Map();
  private fileBuffers: Map<string, Buffer[]> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  handleConnection(client: Socket): void {
    this.logger.log(`Agent connecté: ${client.id}`);
    this.agents.set(client.id, { socket: client, tenantId: '', agentId: '', authenticated: false });
  }

  handleDisconnect(client: Socket): void {
    const agent = this.agents.get(client.id);
    if (agent?.authenticated) {
      this.logger.log(`Agent déconnecté: ${agent.agentId}`);
    }
    this.agents.delete(client.id);
    this.fileBuffers.delete(client.id);
  }

  @SubscribeMessage('auth')
  async handleAuth(@ConnectedSocket() client: Socket, @MessageBody() message: AgentMessage): Promise<void> {
    const { token } = message;
    if (!token) {
      client.emit('message', { type: 'auth_error', message: 'Token manquant' });
      return;
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    // Recherche dans toutes les bases tenant (simplifié pour l'exemple)
    const tenants = await this.prisma.tenant.findMany({ where: { isActive: true } });
    
    for (const tenant of tenants) {
      // En production: vérifier tokenHash dans tenant DB (AgentToken.tokenHash)
      void tokenHash;
      void tenant;
    }

    // Simulation d'auth réussie
    const agent = this.agents.get(client.id);
    if (agent) {
      agent.authenticated = true;
      agent.agentId = `agent-${client.id}`;
      agent.tenantId = 'demo-tenant';
      client.emit('message', { type: 'auth_ok', agentId: agent.agentId, tenantId: agent.tenantId });
      this.logger.log(`Agent authentifié: ${agent.agentId}`);
    }
  }

  @SubscribeMessage('file_start')
  handleFileStart(@ConnectedSocket() client: Socket, @MessageBody() message: AgentMessage): void {
    const agent = this.agents.get(client.id);
    if (!agent?.authenticated) {
      client.emit('message', { type: 'auth_error', message: 'Non authentifié' });
      return;
    }
    this.fileBuffers.set(`${client.id}:${message.filename}`, []);
    this.logger.log(`Réception fichier démarrée: ${message.filename} (${message.size} bytes)`);
  }

  @SubscribeMessage('file_chunk')
  handleFileChunk(@ConnectedSocket() client: Socket, @MessageBody() message: AgentMessage): void {
    const key = `${client.id}:${message.filename}`;
    const buffers = this.fileBuffers.get(key);
    if (buffers && message.data) {
      buffers.push(Buffer.from(message.data, 'base64'));
    }
  }

  @SubscribeMessage('file_end')
  async handleFileEnd(@ConnectedSocket() client: Socket, @MessageBody() message: AgentMessage): Promise<void> {
    const agent = this.agents.get(client.id);
    const key = `${client.id}:${message.filename}`;
    const buffers = this.fileBuffers.get(key);

    if (!buffers || !agent?.authenticated) return;

    const fileData = Buffer.concat(buffers);
    const checksum = crypto.createHash('sha256').update(fileData).digest('hex');

    if (message.checksum && !message.checksum.includes(checksum)) {
      client.emit('message', { type: 'error', message: 'Checksum invalide' });
      return;
    }

    this.logger.log(`Fichier reçu: ${message.filename} (${fileData.length} bytes)`);
    client.emit('message', { type: 'ack', filename: message.filename, executionId: `exec-${Date.now()}` });
    this.fileBuffers.delete(key);
  }

  @SubscribeMessage('heartbeat')
  handleHeartbeat(@ConnectedSocket() client: Socket): void {
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
