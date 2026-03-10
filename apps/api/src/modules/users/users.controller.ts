import {
  Controller,
  Get,
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
import { UsersService } from './users.service';
import { UserResponseDto, UpdateUserDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

interface TenantInfo {
  id: string;
  slug: string;
}

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Liste des utilisateurs du tenant courant' })
  @ApiResponse({ status: 200, description: 'Liste des utilisateurs', type: [UserResponseDto] })
  async findAll(@CurrentTenant() tenant: TenantInfo): Promise<UserResponseDto[]> {
    return this.usersService.findAllByTenant(tenant.id);
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Détail d\'un utilisateur' })
  @ApiResponse({ status: 200, description: 'Utilisateur', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async findOne(
    @CurrentTenant() tenant: TenantInfo,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserResponseDto> {
    return this.usersService.findOne(tenant.id, id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Mettre à jour un utilisateur (role, isActive, firstName, lastName)' })
  @ApiResponse({ status: 200, description: 'Utilisateur mis à jour', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async update(
    @CurrentTenant() tenant: TenantInfo,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.update(tenant.id, id, updateUserDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Désactiver un utilisateur (isActive = false, pas de suppression physique)' })
  @ApiResponse({ status: 204, description: 'Utilisateur désactivé' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async remove(
    @CurrentTenant() tenant: TenantInfo,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.usersService.deactivate(tenant.id, id);
  }
}
