import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { TenantDatabaseService } from './tenant-database.service';
import { PrismaService } from '../../prisma/prisma.service';
import { VaultService } from '../vault/vault.service';
import { Plan } from './dto';

describe('TenantsService', () => {
  let service: TenantsService;
  let vaultService: VaultService;

  const mockTenant = {
    id: 'tenant-123',
    slug: 'test-company',
    name: 'Test Company',
    dbName: 'db_test_company',
    dbConnectionHash: 'encrypted-connection-string',
    plan: 'FREE',
    isActive: true,
    stripeCustomerId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    tenant: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    $executeRawUnsafe: jest.fn(),
  };

  const mockVaultService = {
    encrypt: jest.fn().mockReturnValue('encrypted-string'),
    decrypt: jest.fn().mockReturnValue('postgresql://user:pass@localhost:5432/db_test'),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'DATABASE_URL') {
        return 'postgresql://anexys:password@localhost:5432/anexys_master';
      }
      return undefined;
    }),
  };

  const mockTenantDatabaseService = {
    getClient: jest.fn().mockResolvedValue({
      connector: { count: jest.fn().mockResolvedValue(0) },
      flow: { count: jest.fn().mockResolvedValue(0) },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: VaultService, useValue: mockVaultService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: TenantDatabaseService, useValue: mockTenantDatabaseService },
      ],
    }).compile();

    service = module.get<TenantsService>(TenantsService);
    vaultService = module.get<VaultService>(VaultService);

    jest.clearAllMocks();
  });

  it('devrait être défini', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('devrait retourner tous les tenants', async () => {
      mockPrismaService.tenant.findMany.mockResolvedValue([mockTenant]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('test-company');
    });

    it('devrait retourner une liste vide s\'il n\'y a pas de tenants', async () => {
      mockPrismaService.tenant.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('devrait retourner un tenant par ID', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue(mockTenant);

      const result = await service.findOne('tenant-123');

      expect(result.id).toBe('tenant-123');
      expect(result.slug).toBe('test-company');
    });

    it('devrait lancer NotFoundException si le tenant n\'existe pas', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findBySlug', () => {
    it('devrait retourner un tenant par slug', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue(mockTenant);

      const result = await service.findBySlug('test-company');

      expect(result.slug).toBe('test-company');
    });

    it('devrait lancer NotFoundException si le slug n\'existe pas', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug('invalid-slug')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('devrait mettre à jour un tenant', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrismaService.tenant.update.mockResolvedValue({
        ...mockTenant,
        name: 'Updated Company',
        plan: 'PRO',
      });

      const result = await service.update('tenant-123', {
        name: 'Updated Company',
        plan: Plan.PRO,
      });

      expect(result.name).toBe('Updated Company');
      expect(result.plan).toBe('PRO');
    });

    it('devrait lancer NotFoundException si le tenant n\'existe pas', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.update('invalid-id', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getConnectionString', () => {
    it('devrait retourner la chaîne de connexion déchiffrée', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue(mockTenant);
      mockVaultService.decrypt.mockReturnValue('postgresql://user:pass@localhost:5432/db_test');

      const result = await service.getConnectionString('tenant-123');

      expect(result).toContain('postgresql://');
      expect(vaultService.decrypt).toHaveBeenCalledWith('encrypted-connection-string');
    });

    it('devrait lancer NotFoundException si le tenant n\'existe pas', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue(null);

      await expect(service.getConnectionString('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getTenantWithHash', () => {
    it('devrait retourner les infos du tenant avec le hash', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue({
        id: mockTenant.id,
        slug: mockTenant.slug,
        dbConnectionHash: mockTenant.dbConnectionHash,
      });

      const result = await service.getTenantWithHash('tenant-123');

      expect(result.id).toBe('tenant-123');
      expect(result.dbConnectionHash).toBe('encrypted-connection-string');
    });
  });
});
