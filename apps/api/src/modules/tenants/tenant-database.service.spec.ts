import { Test, TestingModule } from '@nestjs/testing';
import { TenantDatabaseService } from './tenant-database.service';
import { VaultService } from '../vault/vault.service';

describe('TenantDatabaseService', () => {
  let service: TenantDatabaseService;

  const mockVaultService = {
    decrypt: jest.fn().mockReturnValue('postgresql://user:pass@localhost:5432/db_test'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantDatabaseService,
        { provide: VaultService, useValue: mockVaultService },
      ],
    }).compile();

    service = module.get<TenantDatabaseService>(TenantDatabaseService);

    jest.clearAllMocks();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('devrait être défini', () => {
    expect(service).toBeDefined();
  });

  describe('hasConnection', () => {
    it('devrait retourner false pour un tenant sans connexion', () => {
      expect(service.hasConnection('non-existent-tenant')).toBe(false);
    });
  });

  describe('getConnectionCount', () => {
    it('devrait retourner 0 initialement', () => {
      expect(service.getConnectionCount()).toBe(0);
    });
  });

  describe('disconnectTenant', () => {
    it('ne devrait pas lever d\'erreur pour un tenant non connecté', async () => {
      await expect(service.disconnectTenant('non-existent')).resolves.not.toThrow();
    });
  });
});
