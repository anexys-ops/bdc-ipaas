import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AuditService', () => {
  let service: AuditService;

  const mockPrismaService = {
    auditLog: {
      create: jest.fn().mockResolvedValue({
        id: 'audit-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        action: 'LOGIN',
        resource: 'USER',
        createdAt: new Date(),
      }),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'audit-1',
          tenantId: 'tenant-1',
          userId: 'user-1',
          action: 'LOGIN',
          resource: 'USER',
          resourceId: null,
          before: null,
          after: null,
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          createdAt: new Date(),
        },
      ]),
      count: jest.fn().mockResolvedValue(1),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should log an audit entry', async () => {
    await service.log({
      tenantId: 'tenant-1',
      userId: 'user-1',
      action: 'LOGIN',
      resource: 'USER',
    });

    expect(mockPrismaService.auditLog.create).toHaveBeenCalled();
  });

  it('should get audit logs', async () => {
    const result = await service.getLogs('tenant-1');

    expect(result.logs).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.logs[0].action).toBe('LOGIN');
  });

  it('should get recent activity', async () => {
    const result = await service.getRecentActivity('tenant-1');

    expect(Array.isArray(result)).toBe(true);
  });
});
