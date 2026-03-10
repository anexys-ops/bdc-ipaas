import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { EngineService, ExecutionResult } from './engine.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentTenant, Roles, Public } from '../../common/decorators';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Exécution des flux')
@Controller()
export class EngineController {
  constructor(
    private readonly engineService: EngineService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('flows/:flowId/execute')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OPERATOR', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Exécuter un flux manuellement' })
  @ApiResponse({ status: 201, description: 'Exécution lancée' })
  async executeFlow(
    @CurrentTenant() tenant: { id: string },
    @Param('flowId', ParseUUIDPipe) flowId: string,
    @Query('dryRun') dryRun?: string,
  ): Promise<ExecutionResult> {
    return this.engineService.executeFlow(tenant.id, flowId, {
      isDryRun: dryRun === 'true',
      triggerSource: 'MANUAL',
    });
  }

  @Get('flows/:flowId/executions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Historique des exécutions d\'un flux' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Liste des exécutions' })
  async getFlowExecutions(
    @CurrentTenant() tenant: { id: string },
    @Param('flowId', ParseUUIDPipe) flowId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<ExecutionResult[]> {
    return this.engineService.getFlowExecutions(tenant.id, flowId, limit || 20);
  }

  @Get('executions/:executionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Statut d\'une exécution' })
  @ApiResponse({ status: 200, description: 'Détails de l\'exécution' })
  async getExecutionStatus(
    @CurrentTenant() tenant: { id: string },
    @Param('executionId', ParseUUIDPipe) executionId: string,
  ): Promise<ExecutionResult> {
    return this.engineService.getExecutionStatus(tenant.id, executionId);
  }

  @Get('executions/:executionId/logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logs d\'une exécution' })
  @ApiResponse({ status: 200, description: 'Logs de l\'exécution' })
  async getExecutionLogs(
    @CurrentTenant() tenant: { id: string },
    @Param('executionId', ParseUUIDPipe) executionId: string,
  ): Promise<Array<{ level: string; message: string; createdAt: Date }>> {
    return this.engineService.getExecutionLogs(tenant.id, executionId);
  }

  @Get('queues/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Statut des queues BullMQ' })
  @ApiResponse({ status: 200, description: 'Statut des queues (active, waiting, failed, completed)' })
  async getQueueStats(): Promise<{
    flowExecutions: { active: number; waiting: number; failed: number; completed: number } | null;
  }> {
    return this.engineService.getQueueStats();
  }

  @Post('webhooks/:tenantSlug/:flowId')
  @Public()
  @ApiOperation({ summary: 'Webhook pour déclencher un flux' })
  @ApiResponse({ status: 201, description: 'Exécution déclenchée par webhook' })
  async webhookTrigger(
    @Param('tenantSlug') tenantSlug: string,
    @Param('flowId', ParseUUIDPipe) flowId: string,
    @Body() payload: Record<string, unknown>,
  ): Promise<{ executionId: string; status: string }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant || !tenant.isActive) {
      return { executionId: '', status: 'TENANT_NOT_FOUND' };
    }

    try {
      const result = await this.engineService.executeFlow(tenant.id, flowId, {
        isDryRun: false,
        triggerSource: `WEBHOOK:${JSON.stringify(payload).substring(0, 100)}`,
      });

      return {
        executionId: result.executionId,
        status: 'TRIGGERED',
      };
    } catch (error) {
      return {
        executionId: '',
        status: error instanceof Error ? error.message : 'ERROR',
      };
    }
  }
}
