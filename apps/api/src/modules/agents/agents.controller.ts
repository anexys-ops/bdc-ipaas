import { Controller, Get, Post, Delete, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AgentsService } from './agents.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentTenant, Roles } from '../../common/decorators';
import { IsString, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class CreateAgentDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsArray() watchPaths!: string[];
}

@ApiTags('Agents Desktop')
@Controller('agents')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Créer un token agent' })
  create(@CurrentTenant() tenant: { id: string }, @Body() dto: CreateAgentDto) {
    return this.agentsService.createAgentToken(tenant.id, dto.name, dto.watchPaths);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les agents' })
  list(@CurrentTenant() tenant: { id: string }) {
    return this.agentsService.listAgents(tenant.id);
  }

  @Post(':id/revoke')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Révoquer un agent' })
  revoke(@CurrentTenant() tenant: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.agentsService.revokeAgent(tenant.id, id);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Supprimer un agent' })
  delete(@CurrentTenant() tenant: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.agentsService.deleteAgent(tenant.id, id);
  }
}
