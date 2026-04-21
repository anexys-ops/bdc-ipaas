import { Body, Controller, Headers, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { GatewayIngestResult, GatewayService } from './gateway.service';

@ApiTags('Gateway (ingestion Benthos)')
@Controller('gateway')
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

  @Post('ingest')
  @Public()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Ingestion HTTP depuis gate.edicloud.app (auth X-Gate-Token)' })
  @ApiResponse({ status: 202, description: 'Exécution acceptée (traitement async BullMQ ou inline)' })
  async ingest(
    @Headers('x-gate-token') gateToken: string | undefined,
    @Headers('x-route') route: string | undefined,
    @Headers('x-message-id') messageId: string | undefined,
    @Headers('x-client-id') _clientId: string | undefined,
    @Body() body: unknown,
  ): Promise<GatewayIngestResult> {
    return this.gatewayService.ingest({
      gateToken,
      routeHeader: route,
      messageIdHeader: messageId,
      body,
    });
  }
}
