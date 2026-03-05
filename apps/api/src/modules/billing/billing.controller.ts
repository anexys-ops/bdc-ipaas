import { Controller, Get, Post, Delete, Body, Headers, Req, Param, UseGuards, RawBodyRequest } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { BillingService } from './billing.service';
import { CreateSubscriptionDto, BillingResponseDto, InvoiceResponseDto } from './dto/billing.dto';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentTenant, Roles, Public } from '../../common/decorators';

@ApiTags('Billing')
@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get()
  @ApiOperation({ summary: 'Obtenir les informations de facturation' })
  getBillingInfo(@CurrentTenant() tenant: { id: string }): Promise<BillingResponseDto> {
    return this.billingService.getBillingInfo(tenant.id);
  }

  @Post('subscribe')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Créer un abonnement' })
  subscribe(@CurrentTenant() tenant: { id: string }, @Body() dto: CreateSubscriptionDto): Promise<BillingResponseDto> {
    return this.billingService.createSubscription(tenant.id, dto);
  }

  @Delete('subscribe')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Annuler l\'abonnement' })
  cancelSubscription(@CurrentTenant() tenant: { id: string }): Promise<void> {
    return this.billingService.cancelSubscription(tenant.id);
  }

  @Get('usage')
  @ApiOperation({ summary: 'Historique d\'utilisation' })
  getUsageHistory(@CurrentTenant() tenant: { id: string }) {
    return this.billingService.getUsageHistory(tenant.id);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'Liste des factures' })
  getInvoices(@CurrentTenant() tenant: { id: string }): Promise<InvoiceResponseDto[]> {
    return this.billingService.getInvoices(tenant.id);
  }

  @Get('quota/:metricType')
  @ApiOperation({ summary: 'Vérifier un quota' })
  checkQuota(@CurrentTenant() tenant: { id: string }, @Param('metricType') metricType: string) {
    return this.billingService.checkQuota(tenant.id, metricType);
  }

  @Post('webhook')
  @Public()
  @ApiOperation({ summary: 'Webhook Stripe' })
  async handleWebhook(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') signature: string): Promise<void> {
    const payload = req.rawBody;
    if (!payload) return;
    await this.billingService.handleStripeWebhook(payload, signature);
  }
}
