import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  UseGuards, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiBody } from '@nestjs/swagger';
import { MappingsService } from './mappings.service';
import {
  CreateMappingDto, UpdateMappingDto, PreviewMappingDto,
  AutoMapDto, LookupTableDto, MappingResponseDto, MappingRuleDto,
} from './dto/mapping.dto';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentTenant, Roles } from '../../common/decorators';

@ApiTags('Mappings')
@Controller('mappings')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MappingsController {
  constructor(private readonly mappingsService: MappingsService) {}

  @Post()
  @Roles('ADMIN', 'OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Créer un mapping' })
  @ApiResponse({ status: 201, type: MappingResponseDto })
  create(
    @CurrentTenant() tenant: { id: string },
    @Body() dto: CreateMappingDto,
  ): Promise<MappingResponseDto> {
    return this.mappingsService.create(tenant.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les mappings' })
  @ApiResponse({ status: 200, type: [MappingResponseDto] })
  findAll(@CurrentTenant() tenant: { id: string }): Promise<MappingResponseDto[]> {
    return this.mappingsService.findAll(tenant.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un mapping (avec lookup tables)' })
  @ApiResponse({ status: 200, type: MappingResponseDto })
  findOne(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MappingResponseDto> {
    return this.mappingsService.findOne(tenant.id, id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Mettre à jour un mapping (règles, writeMode, matchField, etc.)' })
  @ApiResponse({ status: 200, type: MappingResponseDto })
  update(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMappingDto,
  ): Promise<MappingResponseDto> {
    return this.mappingsService.update(tenant.id, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un mapping' })
  delete(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.mappingsService.delete(tenant.id, id);
  }

  @Post(':id/duplicate')
  @Roles('ADMIN', 'OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Dupliquer un mapping (avec ses lookup tables)' })
  @ApiResponse({ status: 201, type: MappingResponseDto })
  duplicate(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MappingResponseDto> {
    return this.mappingsService.duplicate(tenant.id, id);
  }

  // ─────────────────────────────────────────────────────────
  // Endpoints stateless (pas besoin de tenant dans le chemin)
  // ─────────────────────────────────────────────────────────

  @Post('auto-map')
  @ApiOperation({
    summary: 'Générer automatiquement des règles pour les champs de même nom (source ↔ destination)',
    description: 'Retourne un tableau de règles { destinationField, type: "from", sourceField } pour tous les champs ayant le même nom dans les deux schémas.',
  })
  @ApiBody({ type: AutoMapDto })
  @ApiResponse({ status: 200, schema: { type: 'array', items: { type: 'object' } } })
  autoMap(@Body() dto: AutoMapDto): MappingRuleDto[] {
    return this.mappingsService.autoMap(dto);
  }

  @Post('preview')
  @ApiOperation({
    summary: 'Prévisualiser un mapping sur données échantillon (max 20 lignes)',
    description: 'Supporte: from, value, concatenate, formula (UPPER/LOWER/CONCAT/IF/DATE_FORMAT/ROUND/NUMBER), lookup, conditional.',
  })
  preview(@Body() dto: PreviewMappingDto) {
    return this.mappingsService.preview(dto);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Valider les règles d\'un mapping sans données' })
  validateRules(@Body() body: { rules: MappingRuleDto[] }) {
    return this.mappingsService.validateRules(body.rules);
  }

  @Post('schema/flatten')
  @ApiOperation({ summary: 'Aplatir un JSON Schema imbriqué en liste de champs dotnotation' })
  flattenSchema(@Body() body: { schema: Record<string, unknown> }): { fields: string[] } {
    return { fields: this.mappingsService.flattenSchema(body.schema) };
  }

  // ─────────────────────────────────────────────────────────
  // Dry-run & Mise en production
  // ─────────────────────────────────────────────────────────

  @Post(':id/dry-run')
  @Roles('ADMIN', 'OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Exécuter un dry-run sur des données de test',
    description: 'Si 100% des lignes sont traitées avec succès, le mapping est automatiquement marqué dryRunPassed=true.',
  })
  dryRun(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { sampleData: Record<string, unknown>[] },
  ) {
    return this.mappingsService.dryRun(tenant.id, id, body.sampleData ?? []);
  }

  @Post(':id/promote')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Mettre en production un mapping (nécessite dryRunPassed=true)',
  })
  @ApiResponse({ status: 200, type: MappingResponseDto })
  promote(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MappingResponseDto> {
    return this.mappingsService.update(tenant.id, id, { isProduction: true });
  }

  // ─────────────────────────────────────────────────────────
  // Lookup Tables
  // ─────────────────────────────────────────────────────────

  @Post(':id/lookup-tables')
  @Roles('ADMIN', 'OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Ajouter une lookup table au mapping' })
  addLookupTable(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LookupTableDto,
  ): Promise<{ id: string; name: string }> {
    return this.mappingsService.addLookupTable(tenant.id, id, dto);
  }

  @Get(':id/lookup-tables')
  @ApiOperation({ summary: 'Lister les lookup tables d\'un mapping' })
  getLookupTables(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.mappingsService.getLookupTables(tenant.id, id);
  }

  @Patch(':id/lookup-tables/:tableId')
  @Roles('ADMIN', 'OPERATOR', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mettre à jour une lookup table' })
  updateLookupTable(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tableId', ParseUUIDPipe) tableId: string,
    @Body() dto: LookupTableDto,
  ): Promise<void> {
    return this.mappingsService.updateLookupTable(tenant.id, id, tableId, dto);
  }

  @Delete(':id/lookup-tables/:tableId')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer une lookup table' })
  deleteLookupTable(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tableId', ParseUUIDPipe) tableId: string,
  ): Promise<void> {
    return this.mappingsService.deleteLookupTable(tenant.id, id, tableId);
  }
}
