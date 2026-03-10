import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ConnectorsService } from './connectors.service';
import {
  CreateConnectorDto,
  UpdateConnectorDto,
  TestConfigDto,
  ConnectorResponseDto,
  TestConnectorResponseDto,
  OperationPreviewResponseDto,
  RunRetrievalTestDto,
  RetrievalTestsListResponseDto,
} from './dto';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentTenant, Roles, Audit } from '../../common/decorators';

@ApiTags('Connecteurs')
@Controller('connectors')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ConnectorsController {
  constructor(private readonly connectorsService: ConnectorsService) {}

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Audit('CREATE', 'connector')
  @ApiOperation({ summary: 'Créer un connecteur configuré' })
  @ApiResponse({ status: 201, description: 'Connecteur créé', type: ConnectorResponseDto })
  @ApiResponse({ status: 400, description: 'Type de connecteur inconnu' })
  async create(
    @CurrentTenant() tenant: { id: string },
    @Body() dto: CreateConnectorDto,
  ): Promise<ConnectorResponseDto> {
    return this.connectorsService.create(tenant.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les connecteurs configurés du tenant' })
  @ApiResponse({ status: 200, description: 'Liste des connecteurs', type: [ConnectorResponseDto] })
  async findAll(
    @CurrentTenant() tenant: { id: string },
  ): Promise<ConnectorResponseDto[]> {
    return this.connectorsService.findAll(tenant.id);
  }

  @Get('retrieval-tests/operations')
  @Roles('ADMIN', 'OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Lister les opérations source (récupération) de tous les connecteurs (pour tests)' })
  @ApiResponse({ status: 200, description: 'Connecteurs et leurs opérations source', type: RetrievalTestsListResponseDto })
  async listRetrievalTestOperations(): Promise<RetrievalTestsListResponseDto> {
    return this.connectorsService.listSourceOperationsForRetrievalTests();
  }

  @Post('retrieval-tests/run')
  @Roles('ADMIN', 'OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Exécuter un test de récupération (opération source) avec une config fournie' })
  @ApiResponse({ status: 200, description: 'Aperçu des données récupérées', type: OperationPreviewResponseDto })
  @ApiResponse({ status: 400, description: 'Type/opération inconnu ou erreur API externe' })
  async runRetrievalTest(
    @CurrentTenant() _tenant: { id: string },
    @Body() dto: RunRetrievalTestDto,
  ): Promise<OperationPreviewResponseDto> {
    return this.connectorsService.runSourceOperationWithConfig(
      dto.connectorType,
      dto.operationId,
      dto.config,
      dto.limit ?? 50,
    );
  }

  @Post('test-config')
  @Roles('ADMIN', 'OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Tester une configuration avant enregistrement' })
  @ApiResponse({ status: 200, description: 'Résultat du test', type: TestConnectorResponseDto })
  @ApiResponse({ status: 400, description: 'Type de connecteur inconnu' })
  async testConfig(
    @CurrentTenant() _tenant: { id: string },
    @Query('type') type: string,
    @Body() dto: TestConfigDto,
  ): Promise<TestConnectorResponseDto> {
    return this.connectorsService.testConfig(type, dto.config);
  }

  @Get(':id/config')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Récupérer la configuration (URL, accès, token) du connecteur' })
  @ApiResponse({ status: 200, description: 'Configuration déchiffrée (pour édition)' })
  @ApiResponse({ status: 404, description: 'Connecteur non trouvé' })
  async getConfig(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ config: Record<string, unknown> }> {
    const config = await this.connectorsService.getDecryptedConfig(tenant.id, id);
    return { config };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un connecteur par ID' })
  @ApiResponse({ status: 200, description: 'Détails du connecteur', type: ConnectorResponseDto })
  @ApiResponse({ status: 404, description: 'Connecteur non trouvé' })
  async findOne(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ConnectorResponseDto> {
    return this.connectorsService.findOne(tenant.id, id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Audit('UPDATE', 'connector')
  @ApiOperation({ summary: 'Mettre à jour un connecteur' })
  @ApiResponse({ status: 200, description: 'Connecteur mis à jour', type: ConnectorResponseDto })
  @ApiResponse({ status: 404, description: 'Connecteur non trouvé' })
  async update(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateConnectorDto,
  ): Promise<ConnectorResponseDto> {
    return this.connectorsService.update(tenant.id, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Audit('DELETE', 'connector')
  @ApiOperation({ summary: 'Supprimer un connecteur' })
  @ApiResponse({ status: 204, description: 'Connecteur supprimé' })
  @ApiResponse({ status: 404, description: 'Connecteur non trouvé' })
  async delete(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.connectorsService.delete(tenant.id, id);
  }

  @Post(':id/test')
  @Roles('ADMIN', 'OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Tester la connexion d\'un connecteur' })
  @ApiResponse({ status: 200, description: 'Résultat du test', type: TestConnectorResponseDto })
  @ApiResponse({ status: 404, description: 'Connecteur non trouvé' })
  async testConnection(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TestConnectorResponseDto> {
    return this.connectorsService.testConnection(tenant.id, id);
  }

  @Get(':id/operations/:operationId/preview')
  @Roles('ADMIN', 'OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Aperçu des données d\'une opération source (ex: lister les clients)' })
  @ApiResponse({ status: 200, description: 'Aperçu (nombre + échantillon)', type: OperationPreviewResponseDto })
  @ApiResponse({ status: 404, description: 'Connecteur non trouvé' })
  async operationPreview(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Param('operationId') operationId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ): Promise<OperationPreviewResponseDto> {
    return this.connectorsService.runSourceOperation(tenant.id, id, operationId, limit);
  }
}
