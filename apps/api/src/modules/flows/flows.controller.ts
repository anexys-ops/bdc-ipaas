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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FlowsService } from './flows.service';
import {
  CreateFlowDto,
  UpdateFlowDto,
  AddDestinationDto,
  FlowResponseDto,
  FlowVersionResponseDto,
} from './dto';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentTenant, Roles, Audit } from '../../common/decorators';

@ApiTags('Flux')
@Controller('flows')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FlowsController {
  constructor(private readonly flowsService: FlowsService) {}

  @Post()
  @Roles('ADMIN', 'OPERATOR', 'SUPER_ADMIN')
  @Audit('CREATE', 'flow')
  @ApiOperation({ summary: 'Créer un nouveau flux' })
  @ApiResponse({ status: 201, description: 'Flux créé', type: FlowResponseDto })
  async create(
    @CurrentTenant() tenant: { id: string },
    @Body() dto: CreateFlowDto,
  ): Promise<FlowResponseDto> {
    return this.flowsService.create(tenant.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lister tous les flux' })
  @ApiResponse({ status: 200, description: 'Liste des flux', type: [FlowResponseDto] })
  async findAll(@CurrentTenant() tenant: { id: string }): Promise<FlowResponseDto[]> {
    return this.flowsService.findAll(tenant.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un flux par ID' })
  @ApiResponse({ status: 200, description: 'Détails du flux', type: FlowResponseDto })
  async findOne(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FlowResponseDto> {
    return this.flowsService.findOne(tenant.id, id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'OPERATOR', 'SUPER_ADMIN')
  @Audit('UPDATE', 'flow')
  @ApiOperation({ summary: 'Mettre à jour un flux' })
  @ApiResponse({ status: 200, description: 'Flux mis à jour', type: FlowResponseDto })
  async update(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFlowDto,
  ): Promise<FlowResponseDto> {
    return this.flowsService.update(tenant.id, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Audit('DELETE', 'flow')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un flux' })
  @ApiResponse({ status: 204, description: 'Flux supprimé' })
  async delete(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.flowsService.delete(tenant.id, id);
  }

  @Post(':id/destinations')
  @Roles('ADMIN', 'OPERATOR', 'SUPER_ADMIN')
  @Audit('ADD_DESTINATION', 'flow')
  @ApiOperation({ summary: 'Ajouter une destination au flux' })
  @ApiResponse({ status: 201, description: 'Destination ajoutée', type: FlowResponseDto })
  async addDestination(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddDestinationDto,
  ): Promise<FlowResponseDto> {
    return this.flowsService.addDestination(tenant.id, id, dto);
  }

  @Delete(':id/destinations/:destinationId')
  @Roles('ADMIN', 'OPERATOR', 'SUPER_ADMIN')
  @Audit('REMOVE_DESTINATION', 'flow')
  @ApiOperation({ summary: 'Supprimer une destination du flux' })
  @ApiResponse({ status: 200, description: 'Destination supprimée', type: FlowResponseDto })
  async removeDestination(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Param('destinationId', ParseUUIDPipe) destinationId: string,
  ): Promise<FlowResponseDto> {
    return this.flowsService.removeDestination(tenant.id, id, destinationId);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Historique des versions du flux' })
  @ApiResponse({ status: 200, description: 'Versions du flux', type: [FlowVersionResponseDto] })
  async getVersions(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FlowVersionResponseDto[]> {
    return this.flowsService.getVersions(tenant.id, id);
  }

  @Post(':id/activate')
  @Roles('ADMIN', 'OPERATOR', 'SUPER_ADMIN')
  @Audit('ACTIVATE', 'flow')
  @ApiOperation({ summary: 'Activer un flux' })
  @ApiResponse({ status: 200, description: 'Flux activé', type: FlowResponseDto })
  async activate(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FlowResponseDto> {
    return this.flowsService.setActive(tenant.id, id, true);
  }

  @Post(':id/deactivate')
  @Roles('ADMIN', 'OPERATOR', 'SUPER_ADMIN')
  @Audit('DEACTIVATE', 'flow')
  @ApiOperation({ summary: 'Désactiver un flux' })
  @ApiResponse({ status: 200, description: 'Flux désactivé', type: FlowResponseDto })
  async deactivate(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FlowResponseDto> {
    return this.flowsService.setActive(tenant.id, id, false);
  }
}
