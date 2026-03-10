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
import { GroupsService } from './groups.service';
import {
  CreateGroupDto,
  UpdateGroupDto,
  GroupResponseDto,
  AddUserToGroupDto,
  GroupPermissionResponseDto,
  AddPermissionDto,
} from './dto';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

interface TenantInfo {
  id: string;
  slug: string;
}

@ApiTags('Groups')
@Controller('groups')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Liste des groupes du tenant' })
  @ApiResponse({ status: 200, description: 'Liste des groupes', type: [GroupResponseDto] })
  async findAll(@CurrentTenant() tenant: TenantInfo): Promise<GroupResponseDto[]> {
    return this.groupsService.findAll(tenant.id);
  }

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Créer un groupe' })
  @ApiResponse({ status: 201, description: 'Groupe créé', type: GroupResponseDto })
  async create(
    @CurrentTenant() tenant: TenantInfo,
    @Body() createGroupDto: CreateGroupDto,
  ): Promise<GroupResponseDto> {
    return this.groupsService.create(tenant.id, createGroupDto);
  }

  @Get(':id/permissions')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Lister les permissions d\'un groupe' })
  @ApiResponse({ status: 200, description: 'Permissions', type: [GroupPermissionResponseDto] })
  @ApiResponse({ status: 404, description: 'Groupe non trouvé' })
  async getPermissions(
    @CurrentTenant() tenant: TenantInfo,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<GroupPermissionResponseDto[]> {
    return this.groupsService.getPermissions(tenant.id, id);
  }

  @Post(':id/permissions')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Ajouter une permission à un groupe' })
  @ApiResponse({ status: 201, description: 'Permission ajoutée', type: GroupPermissionResponseDto })
  @ApiResponse({ status: 404, description: 'Groupe non trouvé' })
  async addPermission(
    @CurrentTenant() tenant: TenantInfo,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddPermissionDto,
  ): Promise<GroupPermissionResponseDto> {
    return this.groupsService.addPermission(tenant.id, id, dto);
  }

  @Post(':id/users')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Ajouter un utilisateur au groupe' })
  @ApiResponse({ status: 201, description: 'Utilisateur ajouté' })
  @ApiResponse({ status: 404, description: 'Groupe ou utilisateur non trouvé' })
  @ApiResponse({ status: 409, description: 'Utilisateur déjà dans le groupe' })
  async addUser(
    @CurrentTenant() tenant: TenantInfo,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddUserToGroupDto,
  ): Promise<void> {
    return this.groupsService.addUser(tenant.id, id, dto);
  }

  @Delete(':id/users/:userId')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Retirer un utilisateur du groupe' })
  @ApiResponse({ status: 204, description: 'Utilisateur retiré' })
  @ApiResponse({ status: 404, description: 'Lien groupe-utilisateur non trouvé' })
  async removeUser(
    @CurrentTenant() tenant: TenantInfo,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<void> {
    return this.groupsService.removeUser(tenant.id, id, userId);
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Détail d\'un groupe' })
  @ApiResponse({ status: 200, description: 'Groupe', type: GroupResponseDto })
  @ApiResponse({ status: 404, description: 'Groupe non trouvé' })
  async findOne(
    @CurrentTenant() tenant: TenantInfo,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<GroupResponseDto> {
    return this.groupsService.findOne(tenant.id, id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Modifier un groupe' })
  @ApiResponse({ status: 200, description: 'Groupe mis à jour', type: GroupResponseDto })
  @ApiResponse({ status: 404, description: 'Groupe non trouvé' })
  async update(
    @CurrentTenant() tenant: TenantInfo,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateGroupDto: UpdateGroupDto,
  ): Promise<GroupResponseDto> {
    return this.groupsService.update(tenant.id, id, updateGroupDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Supprimer un groupe' })
  @ApiResponse({ status: 204, description: 'Groupe supprimé' })
  @ApiResponse({ status: 404, description: 'Groupe non trouvé' })
  async remove(
    @CurrentTenant() tenant: TenantInfo,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.groupsService.remove(tenant.id, id);
  }
}
