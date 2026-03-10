import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EdifactService } from './edifact.service';
import { TenantDatabaseService } from '../tenants/tenant-database.service';
import { TenantsService } from '../tenants/tenants.service';

const mockTenant = {
  id: 'tenant-123',
  slug: 'test',
  dbConnectionHash: 'hash',
};

const mockEdifactMessage = {
  id: 'msg-uuid',
  type: 'ORDERS',
  direction: 'INBOUND',
  sender: 'SENDER01',
  receiver: 'RECEIVER01',
  rawContent: "UNB+UNOC:3+SENDER01:14+RECEIVER01:14+240305:1200+1'\nUNH+1+ORDERS:D:96A:UN'",
  parsedData: { type: 'ORDERS', reference: '1', segments: [] },
  reference: '1',
  receivedAt: new Date(),
  processedAt: null,
  status: 'RECEIVED',
  errorMessage: null,
};

describe('EdifactService', () => {
  let service: EdifactService;
  let tenantsService: TenantsService;

  const mockTenantDbService = {
    getClient: jest.fn().mockResolvedValue({
      edifactMessage: {
        create: jest.fn().mockResolvedValue(mockEdifactMessage),
        findMany: jest.fn().mockResolvedValue([mockEdifactMessage]),
        findFirst: jest.fn().mockResolvedValue(mockEdifactMessage),
        count: jest.fn().mockResolvedValue(1),
      },
    }),
  };

  const mockTenantsService = {
    getTenantWithHash: jest.fn().mockResolvedValue(mockTenant),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EdifactService,
        { provide: TenantDatabaseService, useValue: mockTenantDbService },
        { provide: TenantsService, useValue: mockTenantsService },
      ],
    }).compile();

    service = module.get<EdifactService>(EdifactService);
    tenantsService = module.get<TenantsService>(TenantsService);

    jest.clearAllMocks();
  });

  it('devrait être défini', () => {
    expect(service).toBeDefined();
  });

  describe('receive', () => {
    it('devrait parser et enregistrer un message EDIFACT valide', async () => {
      const raw =
        "UNB+UNOC:3+SENDER01:14+RECEIVER01:14+240305:1200+1'\nUNH+1+ORDERS:D:96A:UN'\nBGM+220+PO123+9'\nUNT+3+1'\nUNZ+1+1'";
      const client = await mockTenantDbService.getClient();
      const createSpy = client.edifactMessage.create;

      const result = await service.receive('tenant-123', raw);

      expect(tenantsService.getTenantWithHash).toHaveBeenCalledWith('tenant-123');
      expect(createSpy).toHaveBeenCalled();
      expect(result.message.id).toBe('msg-uuid');
      expect(result.parsed.sender).toBeDefined();
      expect(result.parsed.receiver).toBeDefined();
    });

    it('devrait rejeter un contenu vide', async () => {
      await expect(service.receive('tenant-123', '')).rejects.toThrow(BadRequestException);
      await expect(service.receive('tenant-123', '   ')).rejects.toThrow(BadRequestException);
    });
  });

  describe('validate', () => {
    it('devrait retourner valid: false pour un contenu invalide', () => {
      const result = service.validate('INVALID');
      expect(result.valid).toBe(false);
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('devrait rejeter un contenu vide', () => {
      expect(() => service.validate('')).toThrow(BadRequestException);
      expect(() => service.validate('   ')).toThrow(BadRequestException);
    });
  });

  describe('findMessages', () => {
    it('devrait retourner une liste paginée', async () => {
      const result = await service.findMessages('tenant-123', { page: 1, pageSize: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });
  });

  describe('findOne', () => {
    it('devrait retourner un message par ID', async () => {
      const result = await service.findOne('tenant-123', 'msg-uuid');
      expect(result.id).toBe('msg-uuid');
      expect(result.type).toBe('ORDERS');
    });

    it('devrait lever NotFoundException si message introuvable', async () => {
      const client = await mockTenantDbService.getClient();
      client.edifactMessage.findFirst.mockResolvedValueOnce(null);

      await expect(service.findOne('tenant-123', 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('generate', () => {
    it('devrait générer un ORDERS avec des données valides', async () => {
      const dto = {
        type: 'ORDERS' as const,
        sender: 'SELLER',
        receiver: 'BUYER',
        data: {
          orderNumber: 'PO001',
          orderDate: '2024-03-05',
          buyerCode: 'BUYER',
          sellerCode: 'SELLER',
          lines: [
            { lineNumber: '1', productCode: 'SKU1', quantity: 10, unit: 'PCE', unitPrice: 5.5 },
          ],
        },
      };

      const result = await service.generate('tenant-123', dto);

      expect(result.raw).toBeDefined();
      expect(result.raw).toContain('UNB+');
      expect(result.raw).toContain('ORDERS');
      expect(result.raw).toContain('PO001');
    });

    it('devrait rejeter ORDERS avec données incomplètes', async () => {
      const dto = {
        type: 'ORDERS' as const,
        sender: 'S',
        receiver: 'R',
        data: { orderNumber: 'PO1' }, // manque orderDate, buyerCode, sellerCode, lines
      };

      await expect(service.generate('tenant-123', dto)).rejects.toThrow(BadRequestException);
    });

    it('devrait rejeter un type non implémenté', async () => {
      const dto = {
        type: 'PRICAT' as const,
        sender: 'S',
        receiver: 'R',
      };

      await expect(service.generate('tenant-123', dto)).rejects.toThrow(BadRequestException);
    });
  });
});
