import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MarketplaceService } from './marketplace.service';
import {
  MarketplaceConnectorDto,
  MarketplaceConnectorDetailDto,
  MarketplaceCategoryDto,
} from './dto';
import { Public } from '../../common/decorators';

@ApiTags('Marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Lister tous les connecteurs disponibles' })
  @ApiResponse({
    status: 200,
    description: 'Liste des connecteurs',
    type: [MarketplaceConnectorDto],
  })
  async getAll(): Promise<MarketplaceConnectorDto[]> {
    return this.marketplaceService.getAll();
  }

  @Get('categories')
  @Public()
  @ApiOperation({ summary: 'Lister les connecteurs par catégorie' })
  @ApiResponse({
    status: 200,
    description: 'Connecteurs groupés par catégorie',
    type: [MarketplaceCategoryDto],
  })
  async getByCategories(): Promise<MarketplaceCategoryDto[]> {
    return this.marketplaceService.getByCategories();
  }

  @Get(':type')
  @Public()
  @ApiOperation({ summary: 'Détail d\'un connecteur' })
  @ApiResponse({
    status: 200,
    description: 'Détail du connecteur avec opérations',
    type: MarketplaceConnectorDetailDto,
  })
  @ApiResponse({ status: 404, description: 'Connecteur non trouvé' })
  async getDetail(@Param('type') type: string): Promise<MarketplaceConnectorDetailDto> {
    return this.marketplaceService.getDetail(type);
  }

  @Get(':type/operations/:operationId/schema')
  @Public()
  @ApiOperation({ summary: 'Schéma d\'une opération' })
  @ApiResponse({
    status: 200,
    description: 'Schémas input/output de l\'opération',
  })
  @ApiResponse({ status: 404, description: 'Connecteur ou opération non trouvé' })
  getOperationSchema(
    @Param('type') type: string,
    @Param('operationId') operationId: string,
  ): { input?: unknown; output?: unknown; config?: unknown } {
    return this.marketplaceService.getOperationSchema(type, operationId);
  }
}
