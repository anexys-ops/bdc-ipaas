import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateGroupDto,
  UpdateGroupDto,
  GroupResponseDto,
  AddUserToGroupDto,
  GroupPermissionResponseDto,
  AddPermissionDto,
} from './dto';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string): Promise<GroupResponseDto[]> {
    const groups = await this.prisma.group.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return groups.map((g) => this.toGroupResponse(g));
  }

  async create(tenantId: string, dto: CreateGroupDto): Promise<GroupResponseDto> {
    const group = await this.prisma.group.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description ?? null,
      },
    });
    return this.toGroupResponse(group);
  }

  async findOne(tenantId: string, id: string): Promise<GroupResponseDto> {
    const group = await this.prisma.group.findFirst({
      where: { id, tenantId },
    });
    if (!group) {
      throw new NotFoundException(`Groupe non trouvé: ${id}`);
    }
    return this.toGroupResponse(group);
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateGroupDto,
  ): Promise<GroupResponseDto> {
    await this.assertGroupBelongsToTenant(tenantId, id);
    const group = await this.prisma.group.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });
    return this.toGroupResponse(group);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.assertGroupBelongsToTenant(tenantId, id);
    await this.prisma.$transaction([
      this.prisma.groupPermission.deleteMany({ where: { groupId: id } }),
      this.prisma.userGroup.deleteMany({ where: { groupId: id } }),
      this.prisma.group.delete({ where: { id } }),
    ]);
  }

  async addUser(
    tenantId: string,
    groupId: string,
    dto: AddUserToGroupDto,
  ): Promise<void> {
    await this.assertGroupBelongsToTenant(tenantId, groupId);
    const user = await this.prisma.user.findFirst({
      where: { id: dto.userId, tenantId },
    });
    if (!user) {
      throw new NotFoundException(`Utilisateur non trouvé: ${dto.userId}`);
    }
    const existing = await this.prisma.userGroup.findUnique({
      where: {
        userId_groupId: { userId: dto.userId, groupId },
      },
    });
    if (existing) {
      throw new ConflictException('L\'utilisateur appartient déjà à ce groupe.');
    }
    await this.prisma.userGroup.create({
      data: { userId: dto.userId, groupId },
    });
  }

  async removeUser(
    tenantId: string,
    groupId: string,
    userId: string,
  ): Promise<void> {
    await this.assertGroupBelongsToTenant(tenantId, groupId);
    const link = await this.prisma.userGroup.findUnique({
      where: {
        userId_groupId: { userId, groupId },
      },
    });
    if (!link) {
      throw new NotFoundException(
        'L\'utilisateur n\'appartient pas à ce groupe ou n\'existe pas.',
      );
    }
    await this.prisma.userGroup.delete({
      where: {
        userId_groupId: { userId, groupId },
      },
    });
  }

  async getPermissions(
    tenantId: string,
    groupId: string,
  ): Promise<GroupPermissionResponseDto[]> {
    await this.assertGroupBelongsToTenant(tenantId, groupId);
    const permissions = await this.prisma.groupPermission.findMany({
      where: { groupId },
    });
    return permissions.map((p) => ({
      id: p.id,
      groupId: p.groupId,
      resourceType: p.resourceType,
      resourceId: p.resourceId ?? undefined,
      action: p.action,
    }));
  }

  async addPermission(
    tenantId: string,
    groupId: string,
    dto: AddPermissionDto,
  ): Promise<GroupPermissionResponseDto> {
    await this.assertGroupBelongsToTenant(tenantId, groupId);
    const perm = await this.prisma.groupPermission.create({
      data: {
        groupId,
        resourceType: dto.resourceType,
        resourceId: dto.resourceId ?? null,
        action: dto.action,
      },
    });
    return {
      id: perm.id,
      groupId: perm.groupId,
      resourceType: perm.resourceType,
      resourceId: perm.resourceId ?? undefined,
      action: perm.action,
    };
  }

  private async assertGroupBelongsToTenant(
    tenantId: string,
    groupId: string,
  ): Promise<void> {
    const group = await this.prisma.group.findFirst({
      where: { id: groupId, tenantId },
    });
    if (!group) {
      throw new NotFoundException(`Groupe non trouvé: ${groupId}`);
    }
  }

  private toGroupResponse(g: {
    id: string;
    tenantId: string;
    name: string;
    description: string | null;
    createdAt: Date;
  }): GroupResponseDto {
    return {
      id: g.id,
      tenantId: g.tenantId,
      name: g.name,
      description: g.description ?? undefined,
      createdAt: g.createdAt,
    };
  }
}
