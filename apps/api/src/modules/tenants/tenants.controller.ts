import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  UseGuards, ParseUUIDPipe, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import {
  CreateTenantDto, UpdateTenantDto, TenantResponseDto,
  TenantStatsDto, TenantConnectorDto, TenantUserDto,
  CreateTenantUserDto, UpdateTenantUserDto,
} from './dto';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentTenant, CurrentUser, Roles } from '../../common/decorators';

@ApiTags('Tenants (Back Office)')
@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  // ─── GESTION DES TENANTS (SUPER_ADMIN) ───────────────────────────────────

  @Post()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Créer un nouveau client (tenant) avec sa base de données dédiée' })
  @ApiResponse({ status: 201, type: TenantResponseDto })
  async create(@Body() dto: CreateTenantDto): Promise<TenantResponseDto> {
    return this.tenantsService.create(dto);
  }

  @Get()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Lister tous les clients (avec stats optionnelles)' })
  @ApiQuery({ name: 'withStats', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: [TenantResponseDto] })
  async findAll(@Query('withStats') withStats?: string) {
    return this.tenantsService.findAll({ withStats: withStats === 'true' });
  }

  @Get(':id')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Récupérer un client par ID' })
  @ApiResponse({ status: 200, type: TenantResponseDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<TenantResponseDto> {
    return this.tenantsService.findOne(id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Mettre à jour un client (nom, plan, statut)' })
  @ApiResponse({ status: 200, type: TenantResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenantDto,
  ): Promise<TenantResponseDto> {
    return this.tenantsService.update(id, dto);
  }

  @Post(':id/suspend')
  @Roles('SUPER_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Suspendre un client (isActive = false)' })
  async suspend(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.tenantsService.update(id, { isActive: false });
  }

  @Post(':id/activate')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Réactiver un client suspendu' })
  @ApiResponse({ status: 200, type: TenantResponseDto })
  async activate(@Param('id', ParseUUIDPipe) id: string): Promise<TenantResponseDto> {
    return this.tenantsService.update(id, { isActive: true });
  }

  @Post(':id/impersonate')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Obtenir un token temporaire pour se connecter en tant que ce client' })
  @ApiResponse({ status: 201, description: 'Token JWT temporaire (15 min) pour le compte admin du tenant' })
  async impersonate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() superAdmin: { id: string; email: string },
  ): Promise<{ token: string; expiresIn: string; tenantName: string }> {
    return this.tenantsService.impersonate(id, superAdmin.id);
  }

  // ─── STATS & MÉTRIQUES ───────────────────────────────────────────────────

  @Get(':id/stats')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Statistiques d\'un client (users, connecteurs, flux, exécutions)' })
  @ApiResponse({ status: 200, type: TenantStatsDto })
  async getStats(@Param('id', ParseUUIDPipe) id: string): Promise<TenantStatsDto> {
    return this.tenantsService.getStats(id);
  }

  @Get(':id/billing')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Informations de facturation du client (plan, usage, Stripe)' })
  async getBillingInfo(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantsService.getBillingInfo(id);
  }

  // ─── CONNECTEURS ─────────────────────────────────────────────────────────

  @Get(':id/connectors')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Liste des connecteurs configurés du client' })
  @ApiResponse({ status: 200, type: [TenantConnectorDto] })
  async getConnectors(@Param('id', ParseUUIDPipe) id: string): Promise<TenantConnectorDto[]> {
    return this.tenantsService.getConnectors(id);
  }

  @Delete(':id/connectors/:connectorId')
  @Roles('SUPER_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un connecteur du client' })
  async deleteConnector(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('connectorId', ParseUUIDPipe) connectorId: string,
  ): Promise<void> {
    return this.tenantsService.deleteConnector(id, connectorId);
  }

  // ─── FLUX ─────────────────────────────────────────────────────────────────

  @Get(':id/flows')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Liste des flux du client' })
  async getFlows(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantsService.getFlows(id);
  }

  // ─── UTILISATEURS ────────────────────────────────────────────────────────

  @Get(':id/users')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Liste des utilisateurs du client' })
  @ApiResponse({ status: 200, type: [TenantUserDto] })
  async getUsers(@Param('id', ParseUUIDPipe) id: string): Promise<TenantUserDto[]> {
    return this.tenantsService.getUsers(id);
  }

  @Post(':id/users')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Créer un utilisateur pour le client' })
  @ApiResponse({ status: 201, type: TenantUserDto })
  async createUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTenantUserDto,
  ): Promise<TenantUserDto> {
    return this.tenantsService.createUser(id, dto);
  }

  @Patch(':id/users/:userId')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Modifier un utilisateur du client (rôle, statut, nom)' })
  @ApiResponse({ status: 200, type: TenantUserDto })
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateTenantUserDto,
  ): Promise<TenantUserDto> {
    return this.tenantsService.updateUser(id, userId, dto);
  }

  @Delete(':id/users/:userId')
  @Roles('SUPER_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Désactiver un utilisateur (isActive = false)' })
  async disableUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<void> {
    await this.tenantsService.updateUser(id, userId, { isActive: false });
  }

  // ─── COMPTE COURANT (tenant connecté) ────────────────────────────────────

  @Get('me/info')
  @Roles('ADMIN', 'OPERATOR', 'VIEWER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Informations du tenant courant (pour l\'interface client)' })
  async getMyInfo(@CurrentTenant() tenant: { id: string }): Promise<TenantResponseDto> {
    return this.tenantsService.findOne(tenant.id);
  }

  @Get('me/usage')
  @Roles('ADMIN', 'OPERATOR', 'VIEWER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Consommation actuelle du tenant courant' })
  async getMyUsage(@CurrentTenant() tenant: { id: string }) {
    return this.tenantsService.getBillingInfo(tenant.id);
  }
}
