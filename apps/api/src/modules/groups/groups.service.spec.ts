import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('GroupsService', () => {
  let service: GroupsService;
  const tenantId = 'tenant-123';

  const mockGroup = {
    id: 'group-123',
    tenantId,
    name: 'Support',
    description: 'Équipe support',
    createdAt: new Date(),
  };

  const mockPrismaService = {
    group: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    groupPermission: {
      findMany: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    userGroup: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((ops) => Promise.all(ops)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<GroupsService>(GroupsService);
    jest.clearAllMocks();
  });

  it('devrait être défini', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('devrait retourner la liste des groupes du tenant', async () => {
      mockPrismaService.group.findMany.mockResolvedValue([mockGroup]);
      const result = await service.findAll(tenantId);
      expect(mockPrismaService.group.findMany).toHaveBeenCalledWith({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: mockGroup.id, name: mockGroup.name });
    });
  });

  describe('create', () => {
    it('devrait créer un groupe', async () => {
      mockPrismaService.group.create.mockResolvedValue(mockGroup);
      const result = await service.create(tenantId, {
        name: 'Support',
        description: 'Équipe support',
      });
      expect(result).toMatchObject({ name: 'Support' });
    });
  });

  describe('findOne', () => {
    it('devrait retourner un groupe existant', async () => {
      mockPrismaService.group.findFirst.mockResolvedValue(mockGroup);
      const result = await service.findOne(tenantId, mockGroup.id);
      expect(result).toMatchObject({ id: mockGroup.id });
    });

    it('devrait lever NotFoundException si groupe absent', async () => {
      mockPrismaService.group.findFirst.mockResolvedValue(null);
      await expect(service.findOne(tenantId, 'inconnu')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('devrait mettre à jour un groupe', async () => {
      const updated = { ...mockGroup, name: 'Support Pro' };
      mockPrismaService.group.findFirst.mockResolvedValue(mockGroup);
      mockPrismaService.group.update.mockResolvedValue(updated);
      const result = await service.update(tenantId, mockGroup.id, {
        name: 'Support Pro',
      });
      expect(result.name).toBe('Support Pro');
    });
  });

  describe('remove', () => {
    it('devrait supprimer un groupe', async () => {
      mockPrismaService.group.findFirst.mockResolvedValue(mockGroup);
      mockPrismaService.$transaction.mockResolvedValue([]);
      await service.remove(tenantId, mockGroup.id);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('addUser', () => {
    it('devrait ajouter un user au groupe', async () => {
      const userId = 'user-1';
      mockPrismaService.group.findFirst.mockResolvedValue(mockGroup);
      mockPrismaService.user.findFirst.mockResolvedValue({ id: userId });
      mockPrismaService.userGroup.findUnique.mockResolvedValue(null);
      mockPrismaService.userGroup.create.mockResolvedValue({ userId, groupId: mockGroup.id });
      await service.addUser(tenantId, mockGroup.id, { userId });
      expect(mockPrismaService.userGroup.create).toHaveBeenCalledWith({
        data: { userId, groupId: mockGroup.id },
      });
    });

    it('devrait lever ConflictException si user déjà dans le groupe', async () => {
      mockPrismaService.group.findFirst.mockResolvedValue(mockGroup);
      mockPrismaService.user.findFirst.mockResolvedValue({ id: 'user-1' });
      mockPrismaService.userGroup.findUnique.mockResolvedValue({ userId: 'user-1', groupId: mockGroup.id });
      await expect(
        service.addUser(tenantId, mockGroup.id, { userId: 'user-1' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('removeUser', () => {
    it('devrait retirer un user du groupe', async () => {
      mockPrismaService.group.findFirst.mockResolvedValue(mockGroup);
      mockPrismaService.userGroup.findUnique.mockResolvedValue({
        userId: 'user-1',
        groupId: mockGroup.id,
      });
      mockPrismaService.userGroup.delete.mockResolvedValue(undefined);
      await service.removeUser(tenantId, mockGroup.id, 'user-1');
      expect(mockPrismaService.userGroup.delete).toHaveBeenCalled();
    });

    it('devrait lever NotFoundException si lien absent', async () => {
      mockPrismaService.group.findFirst.mockResolvedValue(mockGroup);
      mockPrismaService.userGroup.findUnique.mockResolvedValue(null);
      await expect(
        service.removeUser(tenantId, mockGroup.id, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPermissions', () => {
    it('devrait retourner les permissions du groupe', async () => {
      const perms = [
        { id: 'p1', groupId: mockGroup.id, resourceType: 'flow', resourceId: null, action: 'read' },
      ];
      mockPrismaService.group.findFirst.mockResolvedValue(mockGroup);
      mockPrismaService.groupPermission.findMany.mockResolvedValue(perms);
      const result = await service.getPermissions(tenantId, mockGroup.id);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ resourceType: 'flow', action: 'read' });
    });
  });

  describe('addPermission', () => {
    it('devrait ajouter une permission', async () => {
      const created = {
        id: 'perm-1',
        groupId: mockGroup.id,
        resourceType: 'flow',
        resourceId: null,
        action: 'read',
      };
      mockPrismaService.group.findFirst.mockResolvedValue(mockGroup);
      mockPrismaService.groupPermission.create.mockResolvedValue(created);
      const result = await service.addPermission(tenantId, mockGroup.id, {
        resourceType: 'flow',
        action: 'read',
      });
      expect(result).toMatchObject({
        id: created.id,
        groupId: created.groupId,
        resourceType: created.resourceType,
        action: created.action,
      });
      expect(result.resourceId === undefined || result.resourceId === null).toBe(true);
    });
  });
});
