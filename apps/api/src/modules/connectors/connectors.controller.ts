import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
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
  ConnectorResponseDto,
  TestConnectorResponseDto,
} from './dto';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentTenant, Roles } from '../../common/decorators';

@ApiTags('Connecteurs')
@Controller('connectors')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ConnectorsController {
  constructor(private readonly connectorsService: ConnectorsService) {}

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
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
}
