import { Test, TestingModule } from '@nestjs/testing';
import { MappingsService } from './mappings.service';
import { TenantDatabaseService } from '../tenants/tenant-database.service';
import { TenantsService } from '../tenants/tenants.service';

describe('MappingsService', () => {
  let service: MappingsService;

  const mockTenantDbService = {
    getClient: jest.fn().mockResolvedValue({
      mapping: {
        create: jest.fn().mockResolvedValue({
          id: 'mapping-1',
          name: 'Test Mapping',
          sourceSchema: {},
          destinationSchema: {},
          rules: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      lookupTable: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
    }),
  };

  const mockTenantsService = {
    getTenantWithHash: jest.fn().mockResolvedValue({ id: 'tenant-1', slug: 'test', dbConnectionHash: 'hash' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MappingsService,
        { provide: TenantDatabaseService, useValue: mockTenantDbService },
        { provide: TenantsService, useValue: mockTenantsService },
      ],
    }).compile();

    service = module.get<MappingsService>(MappingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a mapping', async () => {
    const result = await service.create('tenant-1', {
      name: 'Test Mapping',
      sourceSchema: { field1: 'string' },
      destinationSchema: { field2: 'string' },
      rules: [{ destinationField: 'field2', type: 'from', sourceField: 'field1' }],
    });

    expect(result).toHaveProperty('id');
    expect(result.name).toBe('Test Mapping');
  });

  it('should preview mapping transformation', async () => {
    const result = await service.preview({
      rules: [
        { destinationField: 'name', type: 'from', sourceField: 'firstName' },
        { destinationField: 'upper', type: 'formula', formula: 'UPPER(source.firstName)' },
      ],
      sampleData: [{ firstName: 'John' }, { firstName: 'Jane' }],
    });

    expect(result.results).toHaveLength(2);
    expect(result.results[0].success).toBe(true);
  });
});
