import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { ConnectorRegistryService } from '../connectors/connector-registry.service';
import { MarketplaceItemService } from './marketplace-item.service';

describe('MarketplaceService', () => {
  let service: MarketplaceService;

  const mockConnector = {
    connector_meta: {
      id: 'test-connector',
      name: 'Test Connector',
      version: '1.0',
      icon: 'test.svg',
      category: 'Test Category',
      auth_type: 'api_key',
      docs_url: 'https://docs.example.com',
    },
    auth_config: {
      api_key_header: 'X-API-Key',
    },
    operations: [
      { id: 'list_items', label: 'Lister les items', type: 'source', method: 'GET' },
      { id: 'create_item', label: 'Créer un item', type: 'destination', method: 'POST' },
    ],
    filePath: '/path/to/test/openapi.json',
    loadedAt: new Date(),
  };

  const mockRegistryService = {
    getAll: jest.fn().mockReturnValue([mockConnector]),
    getById: jest.fn((id: string) => (id === 'test-connector' ? mockConnector : undefined)),
  };

  const mockMarketplaceItemService = {
    getOverlayMap: jest.fn().mockResolvedValue(new Map()),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceService,
        { provide: ConnectorRegistryService, useValue: mockRegistryService },
        { provide: MarketplaceItemService, useValue: mockMarketplaceItemService },
      ],
    }).compile();

    service = module.get<MarketplaceService>(MarketplaceService);
    jest.clearAllMocks();
  });

  it('devrait être défini', () => {
    expect(service).toBeDefined();
  });

  describe('getAll', () => {
    it('devrait retourner tous les connecteurs du registre', async () => {
      const result = await service.getAll();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('test-connector');
      expect(result[0].name).toBe('Test Connector');
      expect(result[0].sourceOperationsCount).toBe(1);
      expect(result[0].destinationOperationsCount).toBe(1);
    });
  });

  describe('getByCategories', () => {
    it('devrait grouper les connecteurs par catégorie', async () => {
      const result = await service.getByCategories();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Category');
      expect(result[0].count).toBe(1);
      expect(result[0].connectors).toHaveLength(1);
    });
  });

  describe('getDetail', () => {
    it('devrait retourner le détail d\'un connecteur', async () => {
      const result = await service.getDetail('test-connector');

      expect(result.id).toBe('test-connector');
      expect(result.sourceOperations).toHaveLength(1);
      expect(result.destinationOperations).toHaveLength(1);
      expect(result.authConfig).toBeDefined();
    });

    it('devrait lever NotFoundException pour un connecteur inconnu', async () => {
      await expect(service.getDetail('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getOperationSchema', () => {
    it('devrait retourner le schéma d\'une opération', () => {
      const result = service.getOperationSchema('test-connector', 'list_items');

      expect(result).toBeDefined();
    });

    it('devrait lever NotFoundException pour un connecteur inconnu', () => {
      expect(() => service.getOperationSchema('unknown', 'op')).toThrow(NotFoundException);
    });

    it('devrait lever NotFoundException pour une opération inconnue', () => {
      expect(() => service.getOperationSchema('test-connector', 'unknown-op')).toThrow(
        NotFoundException,
      );
    });
  });
});
