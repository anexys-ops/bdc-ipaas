import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import * as fs from 'fs/promises';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { MarketplaceItemService } from './marketplace-item.service';
import { MarketplaceService } from './marketplace.service';
import { ConnectorRegistryService } from '../connectors/connector-registry.service';
import {
  CreateMarketplaceItemDto,
  UpdateMarketplaceItemDto,
  MarketplaceItemResponseDto,
} from './dto';
import { MarketplaceConnectorDto } from './dto/marketplace-response.dto';

@ApiTags('Marketplace (Admin)')
@Controller('marketplace/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class MarketplaceAdminController {
  constructor(
    private readonly marketplaceItemService: MarketplaceItemService,
    private readonly marketplaceService: MarketplaceService,
    private readonly connectorRegistry: ConnectorRegistryService,
  ) {}

  @Get('connectors')
  @ApiOperation({ summary: 'Lister tous les connecteurs (admin, avec statut activé/désactivé)' })
  @ApiResponse({ status: 200, description: 'Liste des connecteurs avec overlay et enabled' })
  getConnectors(): Promise<MarketplaceConnectorDto[]> {
    return this.marketplaceService.getAllForAdmin();
  }

  @Get('connectors/:connectorId/openapi')
  @ApiOperation({ summary: 'Récupérer le contenu du fichier openapi.json d’un connecteur' })
  @ApiResponse({ status: 200, description: 'Contenu JSON du fichier' })
  @ApiResponse({ status: 404, description: 'Connecteur non trouvé' })
  async getConnectorOpenApi(@Param('connectorId') connectorId: string): Promise<Record<string, unknown>> {
    const filePath = this.connectorRegistry.getOpenApiFilePath(connectorId);
    if (!filePath) {
      throw new NotFoundException(`Connecteur non trouvé: ${connectorId}`);
    }
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as Record<string, unknown>;
  }

  @Put('connectors/:connectorId/openapi')
  @ApiOperation({ summary: 'Mettre à jour le fichier openapi.json d’un connecteur' })
  @ApiResponse({ status: 200, description: 'Fichier mis à jour' })
  @ApiResponse({ status: 404, description: 'Connecteur non trouvé' })
  async putConnectorOpenApi(
    @Param('connectorId') connectorId: string,
    @Body() body: Record<string, unknown>,
  ): Promise<{ ok: boolean }> {
    const filePath = this.connectorRegistry.getOpenApiFilePath(connectorId);
    if (!filePath) {
      throw new NotFoundException(`Connecteur non trouvé: ${connectorId}`);
    }
    const meta = body?.connector_meta as { id?: string } | undefined;
    if (!meta || meta.id !== connectorId) {
      throw new BadRequestException('Le champ connector_meta.id doit correspondre au connecteur');
    }
    const content = JSON.stringify(body, null, 2);
    await fs.writeFile(filePath, content, 'utf-8');
    return { ok: true };
  }

  @Get('items')
  @ApiOperation({ summary: 'Lister tous les éléments marketplace (admin)' })
  @ApiResponse({ status: 200, description: 'Liste des éléments', type: [MarketplaceItemResponseDto] })
  findAll() {
    return this.marketplaceItemService.findAll();
  }

  @Post('items')
  @ApiOperation({ summary: 'Créer un élément marketplace' })
  @ApiResponse({ status: 201, description: 'Élément créé', type: MarketplaceItemResponseDto })
  @ApiResponse({ status: 409, description: 'Un élément existe déjà pour ce connecteur' })
  create(@Body() dto: CreateMarketplaceItemDto) {
    return this.marketplaceItemService.create(dto);
  }

  @Put('items/:connectorId')
  @ApiOperation({ summary: 'Modifier un élément marketplace par connectorId' })
  @ApiResponse({ status: 200, description: 'Élément mis à jour', type: MarketplaceItemResponseDto })
  @ApiResponse({ status: 404, description: 'Élément non trouvé' })
  update(@Param('connectorId') connectorId: string, @Body() dto: UpdateMarketplaceItemDto) {
    return this.marketplaceItemService.update(connectorId, dto);
  }

  @Delete('items/:connectorId')
  @ApiOperation({ summary: 'Supprimer un élément marketplace' })
  @ApiResponse({ status: 204, description: 'Élément supprimé' })
  @ApiResponse({ status: 404, description: 'Élément non trouvé' })
  async delete(@Param('connectorId') connectorId: string) {
    await this.marketplaceItemService.delete(connectorId);
  }
}
