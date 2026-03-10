import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../generated/master';
import { UserResponseDto, UpdateUserDto } from './dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByTenant(tenantId: string): Promise<UserResponseDto[]> {
    const users = await this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return users.map((u) => this.toResponse(u));
  }

  async findOne(tenantId: string, id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException(`Utilisateur non trouvé: ${id}`);
    }
    return this.toResponse(user);
  }

  async update(tenantId: string, id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
    });
    if (!user) {
      throw new NotFoundException(`Utilisateur non trouvé: ${id}`);
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.role !== undefined && { role: dto.role as Role }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
      },
    });
    return this.toResponse(updated);
  }

  /**
   * Désactive un utilisateur (isActive = false). Pas de suppression physique.
   */
  async deactivate(tenantId: string, id: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
    });
    if (!user) {
      throw new NotFoundException(`Utilisateur non trouvé: ${id}`);
    }
    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  private toResponse(u: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    lastLoginAt: Date | null;
  }): UserResponseDto {
    return {
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt ?? undefined,
    };
  }
}
