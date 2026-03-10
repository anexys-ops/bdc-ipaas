import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  const tenantId = 'tenant-123';

  const mockUser = {
    id: 'user-123',
    email: 'user@test.com',
    firstName: 'Jean',
    lastName: 'Dupont',
    role: 'VIEWER',
    isActive: true,
    lastLoginAt: null,
  };

  const mockPrismaService = {
    user: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('devrait être défini', () => {
    expect(service).toBeDefined();
  });

  describe('findAllByTenant', () => {
    it('devrait retourner la liste des users du tenant', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([mockUser]);
      const result = await service.findAllByTenant(tenantId);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: { tenantId },
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        role: mockUser.role,
        isActive: mockUser.isActive,
      });
    });
  });

  describe('findOne', () => {
    it('devrait retourner un user existant', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      const result = await service.findOne(tenantId, mockUser.id);
      expect(result).toMatchObject({ id: mockUser.id, email: mockUser.email });
    });

    it('devrait lever NotFoundException si user absent', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      await expect(service.findOne(tenantId, 'inconnu')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('devrait mettre à jour un user', async () => {
      const updated = { ...mockUser, firstName: 'Pierre' };
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(updated);
      const result = await service.update(tenantId, mockUser.id, { firstName: 'Pierre' });
      expect(result.firstName).toBe('Pierre');
    });

    it('devrait lever NotFoundException si user absent', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      await expect(service.update(tenantId, 'inconnu', { firstName: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deactivate', () => {
    it('devrait désactiver un user', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({ ...mockUser, isActive: false });
      await service.deactivate(tenantId, mockUser.id);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { isActive: false },
      });
    });

    it('devrait lever NotFoundException si user absent', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      await expect(service.deactivate(tenantId, 'inconnu')).rejects.toThrow(NotFoundException);
    });
  });
});
