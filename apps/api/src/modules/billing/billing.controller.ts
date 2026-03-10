import { Controller, Get, Post, Delete, Body, Headers, Req, Param, UseGuards, RawBodyRequest, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { BillingService } from './billing.service';
import { CreateSubscriptionDto, CreatePortalSessionDto, BillingResponseDto, InvoiceResponseDto, PlanInfoDto } from './dto/billing.dto';
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

  @Post('portal')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Créer une session du portail client Stripe' })
  createPortalSession(
    @CurrentTenant() tenant: { id: string },
    @Body() dto: CreatePortalSessionDto,
  ): Promise<{ url: string }> {
    return this.billingService.createPortalSession(tenant.id, dto.returnUrl);
  }

  @Get('plans')
  @Public()
  @ApiOperation({ summary: 'Plans disponibles avec prix et limites (sans auth)' })
  getPlans(): PlanInfoDto[] {
    return this.billingService.getPlans();
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

  @Get('invoices/:id/export')
  @ApiOperation({ summary: 'Export facture en JSON (compatibilité ancien module EDI-Connect)' })
  async exportInvoiceJson(
    @CurrentTenant() tenant: { id: string },
    @Param('id') id: string,
  ): Promise<InvoiceResponseDto> {
    const invoice = await this.billingService.getInvoiceById(tenant.id, id);
    if (!invoice) throw new NotFoundException(`Facture non trouvée: ${id}`);
    return invoice;
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Détail d\'une facture (JSON, équivalent ancien EDI-Connect export_json)' })
  async getInvoiceById(
    @CurrentTenant() tenant: { id: string },
    @Param('id') id: string,
  ): Promise<InvoiceResponseDto> {
    const invoice = await this.billingService.getInvoiceById(tenant.id, id);
    if (!invoice) throw new NotFoundException(`Facture non trouvée: ${id}`);
    return invoice;
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
