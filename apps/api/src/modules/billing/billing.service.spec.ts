import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BillingService } from './billing.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BillingPlan } from './dto/billing.dto';

describe('BillingService', () => {
  let service: BillingService;

  const mockPrismaService = {
    tenant: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'tenant-1',
        name: 'Test Tenant',
        plan: 'PRO',
        stripeCustomerId: 'cus_123',
      }),
      update: jest.fn(),
    },
    usageMetric: {
      upsert: jest.fn().mockResolvedValue({
        id: 'metric-1',
        flowsExecuted: 1,
        recordsProcessed: BigInt(0),
        apiCallsMade: 0,
        periodStart: new Date(),
        periodEnd: new Date(),
      }),
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    billingInvoice: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue(null),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should get billing info', async () => {
    const result = await service.getBillingInfo('tenant-1');

    expect(result.tenantId).toBe('tenant-1');
    expect(result.plan).toBe(BillingPlan.PRO);
    expect(result.limits).toBeDefined();
    expect(result.usage).toBeDefined();
  });

  it('should record usage', async () => {
    await service.recordUsage('tenant-1', 1, 0, 0);
    expect(mockPrismaService.usageMetric.upsert).toHaveBeenCalled();
  });

  it('should check quota', async () => {
    const result = await service.checkQuota('tenant-1', 'executions');

    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('current');
    expect(result).toHaveProperty('limit');
  });

  it('should get invoices', async () => {
    const result = await service.getInvoices('tenant-1');

    expect(Array.isArray(result)).toBe(true);
  });
});
