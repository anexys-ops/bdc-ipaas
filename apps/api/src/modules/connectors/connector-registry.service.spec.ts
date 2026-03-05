import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ConnectorRegistryService } from './connector-registry.service';
import * as path from 'path';

describe('ConnectorRegistryService', () => {
  let service: ConnectorRegistryService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'CONNECTORS_PATH') {
        return path.join(__dirname, '../../../../../connectors');
      }
      return undefined;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectorRegistryService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ConnectorRegistryService>(ConnectorRegistryService);
    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('devrait être défini', () => {
    expect(service).toBeDefined();
  });

  describe('chargement des connecteurs', () => {
    it('devrait charger les connecteurs depuis le dossier', () => {
      expect(service.count()).toBeGreaterThan(0);
    });

    it('devrait avoir chargé le connecteur Sellsy', () => {
      const sellsy = service.getById('sellsy');
      expect(sellsy).toBeDefined();
      expect(sellsy?.connector_meta.name).toBe('Sellsy');
    });

    it('devrait avoir chargé le connecteur EBP', () => {
      const ebp = service.getById('ebp');
      expect(ebp).toBeDefined();
      expect(ebp?.connector_meta.category).toBe('ERP / Comptabilité');
    });
  });

  describe('getAll', () => {
    it('devrait retourner tous les connecteurs', () => {
      const all = service.getAll();
      expect(Array.isArray(all)).toBe(true);
      expect(all.length).toBeGreaterThan(0);
    });
  });

  describe('getById', () => {
    it('devrait retourner un connecteur par ID', () => {
      const connector = service.getById('dolibarr');
      expect(connector).toBeDefined();
      expect(connector?.connector_meta.id).toBe('dolibarr');
    });

    it('devrait retourner undefined pour un ID inconnu', () => {
      const connector = service.getById('unknown-connector');
      expect(connector).toBeUndefined();
    });
  });

  describe('getSourceOperations', () => {
    it('devrait retourner les opérations source d\'un connecteur', () => {
      const ops = service.getSourceOperations('sellsy');
      expect(ops.length).toBeGreaterThan(0);
      expect(ops.every((op) => op.type === 'source')).toBe(true);
    });

    it('devrait retourner un tableau vide pour un connecteur inconnu', () => {
      const ops = service.getSourceOperations('unknown');
      expect(ops).toEqual([]);
    });
  });

  describe('getDestinationOperations', () => {
    it('devrait retourner les opérations destination d\'un connecteur', () => {
      const ops = service.getDestinationOperations('sellsy');
      expect(ops.length).toBeGreaterThan(0);
      expect(ops.every((op) => op.type === 'destination')).toBe(true);
    });
  });

  describe('exists', () => {
    it('devrait retourner true pour un connecteur existant', () => {
      expect(service.exists('sellsy')).toBe(true);
    });

    it('devrait retourner false pour un connecteur inexistant', () => {
      expect(service.exists('unknown')).toBe(false);
    });
  });
});
