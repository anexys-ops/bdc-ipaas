import { Test, TestingModule } from '@nestjs/testing';
import { AgentsService } from './agents.service';
import { TenantDatabaseService } from '../tenants/tenant-database.service';
import { TenantsService } from '../tenants/tenants.service';

describe('AgentsService', () => {
  let service: AgentsService;

  const mockTenantDbService = {
    getClient: jest.fn().mockResolvedValue({
      agentToken: {
        create: jest.fn().mockResolvedValue({
          id: 'agent-1',
          name: 'Test Agent',
          tokenHash: 'hash123',
          watchPaths: ['/tmp/data'],
          isActive: true,
          lastSeenAt: null,
          createdAt: new Date(),
        }),
        findMany: jest.fn().mockResolvedValue([
          { id: 'agent-1', name: 'Test Agent', isActive: true, lastSeenAt: null },
        ]),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    }),
  };

  const mockTenantsService = {
    getTenantWithHash: jest.fn().mockResolvedValue({ id: 'tenant-1', slug: 'test', dbConnectionHash: 'hash' }),
    findBySlug: jest.fn().mockResolvedValue({ id: 'tenant-1', slug: 'test', isActive: true }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentsService,
        { provide: TenantDatabaseService, useValue: mockTenantDbService },
        { provide: TenantsService, useValue: mockTenantsService },
      ],
    }).compile();

    service = module.get<AgentsService>(AgentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create agent token', async () => {
    const result = await service.createAgentToken('tenant-1', 'Test Agent', ['/tmp/data']);

    expect(result.id).toBe('agent-1');
    expect(result.token).toBeDefined();
    expect(result.token).toMatch(/^test\.[a-f0-9]{64}$/);
  });

  it('should list agents', async () => {
    const result = await service.listAgents('tenant-1');

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Test Agent');
  });

  describe('authenticateToken', () => {
    const validToken = `test.${'a'.repeat(64)}`;

    it('rejette un jeton mal formé sans interroger la base', async () => {
      mockTenantsService.findBySlug.mockClear();
      expect(await service.authenticateToken('nimportequoi')).toBeNull();
      expect(await service.authenticateToken('a'.repeat(64))).toBeNull();
      expect(mockTenantsService.findBySlug).not.toHaveBeenCalled();
    });

    it('rejette un tenant inconnu', async () => {
      mockTenantsService.findBySlug.mockRejectedValueOnce(new Error('not found'));
      expect(await service.authenticateToken(validToken)).toBeNull();
    });

    it('rejette un tenant inactif', async () => {
      mockTenantsService.findBySlug.mockResolvedValueOnce({ id: 'tenant-1', slug: 'test', isActive: false });
      expect(await service.authenticateToken(validToken)).toBeNull();
    });

    it('rejette un jeton inconnu ou révoqué', async () => {
      const client = await mockTenantDbService.getClient();
      client.agentToken.findUnique.mockResolvedValueOnce(null);
      expect(await service.authenticateToken(validToken)).toBeNull();
      client.agentToken.findUnique.mockResolvedValueOnce({ id: 'agent-1', isActive: false });
      expect(await service.authenticateToken(validToken)).toBeNull();
    });

    it('accepte un jeton valide', async () => {
      const client = await mockTenantDbService.getClient();
      client.agentToken.findUnique.mockResolvedValueOnce({ id: 'agent-1', isActive: true });
      expect(await service.authenticateToken(validToken)).toEqual({ tenantId: 'tenant-1', agentId: 'agent-1' });
    });
  });
});
