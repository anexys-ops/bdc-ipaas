import { Socket } from 'socket.io';
import { AgentsGateway } from './agents.gateway';
import { AgentsService } from './agents.service';

const makeSocket = (id: string, token?: string) =>
  ({
    id,
    handshake: { auth: token ? { token } : {}, address: '127.0.0.1' },
    emit: jest.fn(),
    disconnect: jest.fn(),
  }) as unknown as Socket & { emit: jest.Mock; disconnect: jest.Mock };

describe('AgentsGateway', () => {
  let gateway: AgentsGateway;
  const authenticateToken = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    authenticateToken.mockReset();
    gateway = new AgentsGateway({ authenticateToken } as unknown as AgentsService);
  });

  afterEach(() => jest.useRealTimers());

  it('refuse un jeton de handshake invalide', async () => {
    authenticateToken.mockResolvedValue(null);
    const socket = makeSocket('s1', 'bad');
    await gateway.handleConnection(socket);
    expect(socket.emit).toHaveBeenCalledWith('message', { type: 'auth_error', message: 'Token invalide' });
    expect(socket.disconnect).toHaveBeenCalledWith(true);
    expect(gateway.getConnectedAgents()).toHaveLength(0);
  });

  it('accepte un jeton de handshake valide', async () => {
    authenticateToken.mockResolvedValue({ tenantId: 't1', agentId: 'a1' });
    const socket = makeSocket('s1', 'good');
    await gateway.handleConnection(socket);
    expect(socket.disconnect).not.toHaveBeenCalled();
    expect(gateway.getConnectedAgents()).toEqual([{ agentId: 'a1', tenantId: 't1' }]);
  });

  it('déconnecte un client sans jeton après le délai', async () => {
    const socket = makeSocket('s1');
    await gateway.handleConnection(socket);
    expect(socket.disconnect).not.toHaveBeenCalled();
    jest.advanceTimersByTime(10_000);
    expect(socket.disconnect).toHaveBeenCalledWith(true);
  });

  it('refuse les fichiers des clients non authentifiés', async () => {
    const socket = makeSocket('s1');
    await gateway.handleConnection(socket);
    await gateway.handleFileStart(socket, { type: 'file_start', filename: 'f.txt', size: 10 });
    expect(socket.disconnect).toHaveBeenCalledWith(true);
  });

  it('refuse un fichier trop volumineux et un dépassement de taille déclarée', async () => {
    authenticateToken.mockResolvedValue({ tenantId: 't1', agentId: 'a1' });
    const socket = makeSocket('s1', 'good');
    await gateway.handleConnection(socket);

    await gateway.handleFileStart(socket, { type: 'file_start', filename: 'big', size: 51 * 1024 * 1024 });
    expect(socket.emit).toHaveBeenLastCalledWith('message', expect.objectContaining({ type: 'error', filename: 'big' }));

    await gateway.handleFileStart(socket, { type: 'file_start', filename: 'small', size: 2 });
    await gateway.handleFileChunk(socket, { type: 'file_chunk', filename: 'small', data: Buffer.from('abcd').toString('base64') });
    expect(socket.emit).toHaveBeenLastCalledWith('message', expect.objectContaining({ message: 'Taille de fichier dépassée' }));
  });

  it('déconnecte un agent révoqué', async () => {
    authenticateToken.mockResolvedValue({ tenantId: 't1', agentId: 'a1' });
    const socket = makeSocket('s1', 'good');
    await gateway.handleConnection(socket);
    gateway.disconnectAgent('t1', 'a1');
    expect(socket.disconnect).toHaveBeenCalledWith(true);
  });
});
