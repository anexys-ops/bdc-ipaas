import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMarketplaceItemDto, UpdateMarketplaceItemDto } from './dto';

@Injectable()
export class MarketplaceItemService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.marketplaceItem.findMany({ orderBy: { connectorId: 'asc' } });
  }

  async findByConnectorId(connectorId: string) {
    return this.prisma.marketplaceItem.findUnique({ where: { connectorId } });
  }

  async getOverlayMap(): Promise<
    Map<
      string,
      {
        stars: number;
        priceLabel: string;
        description: string | null;
        apiJsonPath: string | null;
        libraryLogoId: string | null;
        enabled: boolean;
      }
    >
  > {
    const items = await this.prisma.marketplaceItem.findMany();
    const map = new Map<
      string,
      {
        stars: number;
        priceLabel: string;
        description: string | null;
        apiJsonPath: string | null;
        libraryLogoId: string | null;
        enabled: boolean;
      }
    >();
    for (const item of items) {
      map.set(item.connectorId, {
        stars: item.stars,
        priceLabel: item.priceLabel,
        description: item.description,
        apiJsonPath: item.apiJsonPath,
        libraryLogoId: item.libraryLogoId ?? null,
        enabled: item.enabled,
      });
    }
    return map;
  }

  async create(dto: CreateMarketplaceItemDto) {
    const existing = await this.prisma.marketplaceItem.findUnique({
      where: { connectorId: dto.connectorId },
    });
    if (existing) {
      throw new ConflictException(`Un élément marketplace existe déjà pour le connecteur ${dto.connectorId}`);
    }
    return this.prisma.marketplaceItem.create({
      data: {
        connectorId: dto.connectorId,
        stars: dto.stars ?? 5,
        priceLabel: dto.priceLabel ?? '99€ HT',
        description: dto.description ?? null,
        apiJsonPath: dto.apiJsonPath ?? null,
        libraryLogoId: dto.libraryLogoId?.trim() ? dto.libraryLogoId.trim() : null,
        enabled: dto.enabled ?? true,
      },
    });
  }

  async update(connectorId: string, dto: UpdateMarketplaceItemDto) {
    const existing = await this.prisma.marketplaceItem.findUnique({
      where: { connectorId },
    });
    if (!existing) {
      throw new NotFoundException(`Élément marketplace non trouvé pour le connecteur ${connectorId}`);
    }
    return this.prisma.marketplaceItem.update({
      where: { connectorId },
      data: {
        ...(dto.stars !== undefined && { stars: dto.stars }),
        ...(dto.priceLabel !== undefined && { priceLabel: dto.priceLabel }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.apiJsonPath !== undefined && { apiJsonPath: dto.apiJsonPath }),
        ...(dto.enabled !== undefined && { enabled: dto.enabled }),
        ...(dto.libraryLogoId !== undefined && {
          libraryLogoId: dto.libraryLogoId && dto.libraryLogoId.trim() ? dto.libraryLogoId.trim() : null,
        }),
      },
    });
  }

  async delete(connectorId: string): Promise<void> {
    const existing = await this.prisma.marketplaceItem.findUnique({
      where: { connectorId },
    });
    if (!existing) {
      throw new NotFoundException(`Élément marketplace non trouvé pour le connecteur ${connectorId}`);
    }
    await this.prisma.marketplaceItem.delete({ where: { connectorId } });
  }

  async upsertForConnector(
    connectorId: string,
    defaults: { stars: number; priceLabel: string },
  ) {
    return this.prisma.marketplaceItem.upsert({
      where: { connectorId },
      create: {
        connectorId,
        stars: defaults.stars,
        priceLabel: defaults.priceLabel,
        enabled: true,
      },
      update: {},
    });
  }
}
