import { Controller, Get, Query, UseGuards, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuditService, AuditLogEntry } from './audit.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentTenant, Roles } from '../../common/decorators';

@ApiTags('Audit')
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Obtenir les logs d\'audit' })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'resource', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  async getLogs(
    @CurrentTenant() tenant: { id: string },
    @Query('action') action?: string,
    @Query('resource') resource?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<{ logs: AuditLogEntry[]; total: number }> {
    return this.auditService.getLogs(tenant.id, {
      action,
      resource,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get('recent')
  @ApiOperation({ summary: 'Activité récente' })
  getRecentActivity(@CurrentTenant() tenant: { id: string }): Promise<AuditLogEntry[]> {
    return this.auditService.getRecentActivity(tenant.id);
  }

  @Get('user/:userId')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Activité d\'un utilisateur' })
  getUserActivity(@CurrentTenant() tenant: { id: string }, @Param('userId', ParseUUIDPipe) userId: string): Promise<AuditLogEntry[]> {
    return this.auditService.getUserActivity(tenant.id, userId);
  }
}
