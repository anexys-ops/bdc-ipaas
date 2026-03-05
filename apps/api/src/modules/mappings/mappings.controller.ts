import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MappingsService } from './mappings.service';
import { CreateMappingDto, UpdateMappingDto, PreviewMappingDto, LookupTableDto, MappingResponseDto } from './dto/mapping.dto';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentTenant, Roles, Public } from '../../common/decorators';

@ApiTags('Mappings')
@Controller('mappings')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MappingsController {
  constructor(private readonly mappingsService: MappingsService) {}

  @Post()
  @Roles('ADMIN', 'OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Créer un mapping' })
  create(@CurrentTenant() tenant: { id: string }, @Body() dto: CreateMappingDto): Promise<MappingResponseDto> {
    return this.mappingsService.create(tenant.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les mappings' })
  findAll(@CurrentTenant() tenant: { id: string }): Promise<MappingResponseDto[]> {
    return this.mappingsService.findAll(tenant.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un mapping' })
  findOne(@CurrentTenant() tenant: { id: string }, @Param('id', ParseUUIDPipe) id: string): Promise<MappingResponseDto> {
    return this.mappingsService.findOne(tenant.id, id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'OPERATOR', 'SUPER_ADMIN')
  update(@CurrentTenant() tenant: { id: string }, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMappingDto): Promise<MappingResponseDto> {
    return this.mappingsService.update(tenant.id, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  delete(@CurrentTenant() tenant: { id: string }, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.mappingsService.delete(tenant.id, id);
  }

  @Post('preview')
  @Public()
  @ApiOperation({ summary: 'Prévisualiser un mapping sur des données échantillon' })
  preview(@Body() dto: PreviewMappingDto): Promise<{ results: Array<{ success: boolean; data?: Record<string, unknown>; error?: string }> }> {
    return this.mappingsService.preview(dto);
  }

  @Post(':id/lookup-tables')
  @Roles('ADMIN', 'OPERATOR', 'SUPER_ADMIN')
  addLookupTable(@CurrentTenant() tenant: { id: string }, @Param('id', ParseUUIDPipe) id: string, @Body() dto: LookupTableDto): Promise<void> {
    return this.mappingsService.addLookupTable(tenant.id, id, dto);
  }

  @Get(':id/lookup-tables')
  getLookupTables(@CurrentTenant() tenant: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.mappingsService.getLookupTables(tenant.id, id);
  }
}
