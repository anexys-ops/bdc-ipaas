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
    expect(result.token.length).toBe(64);
  });

  it('should list agents', async () => {
    const result = await service.listAgents('tenant-1');

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Test Agent');
  });
});
