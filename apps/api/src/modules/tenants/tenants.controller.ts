import {
  Controller,
  Get,
  Post,
  Patch,
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
import { TenantsService } from './tenants.service';
import { CreateTenantDto, UpdateTenantDto, TenantResponseDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';

@ApiTags('Tenants')
@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Créer un nouveau tenant (Super Admin uniquement)' })
  @ApiResponse({ status: 201, description: 'Tenant créé', type: TenantResponseDto })
  @ApiResponse({ status: 409, description: 'Slug ou base de données déjà existant' })
  @ApiResponse({ status: 403, description: 'Accès refusé - Super Admin requis' })
  async create(@Body() createTenantDto: CreateTenantDto): Promise<TenantResponseDto> {
    return this.tenantsService.create(createTenantDto);
  }

  @Get()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Lister tous les tenants (Super Admin uniquement)' })
  @ApiResponse({ status: 200, description: 'Liste des tenants', type: [TenantResponseDto] })
  async findAll(): Promise<TenantResponseDto[]> {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Récupérer un tenant par ID (Super Admin uniquement)' })
  @ApiResponse({ status: 200, description: 'Détails du tenant', type: TenantResponseDto })
  @ApiResponse({ status: 404, description: 'Tenant non trouvé' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<TenantResponseDto> {
    return this.tenantsService.findOne(id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Mettre à jour un tenant (Super Admin uniquement)' })
  @ApiResponse({ status: 200, description: 'Tenant mis à jour', type: TenantResponseDto })
  @ApiResponse({ status: 404, description: 'Tenant non trouvé' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTenantDto: UpdateTenantDto,
  ): Promise<TenantResponseDto> {
    return this.tenantsService.update(id, updateTenantDto);
  }
}
