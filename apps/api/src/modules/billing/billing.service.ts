import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BillingPlan,
  PLAN_LIMITS,
  CreateSubscriptionDto,
  CreateCheckoutSessionDto,
  BillingResponseDto,
  InvoiceResponseDto,
} from './dto/billing.dto';
import Stripe from 'stripe';

function getStripePriceIds(configService: { get: (key: string) => string | undefined }): Record<BillingPlan, string> {
  return {
    [BillingPlan.FREE]: '',
    [BillingPlan.STARTER]: configService.get('STRIPE_PRICE_STARTER') ?? '',
    [BillingPlan.PRO]: configService.get('STRIPE_PRICE_PRO') ?? '',
    [BillingPlan.ENTERPRISE]: configService.get('STRIPE_PRICE_ENTERPRISE') ?? '',
  };
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private stripe: Stripe | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
    }
  }

  async getBillingInfo(tenantId: string): Promise<BillingResponseDto> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException(`Tenant non trouvé: ${tenantId}`);

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const usage = await this.getCurrentUsage(tenantId, periodStart, periodEnd);
    const plan = this.mapPlanToBillingPlan(tenant.plan);

    return {
      tenantId,
      plan,
      stripeCustomerId: tenant.stripeCustomerId,
      stripeSubscriptionId: tenant.stripeSubscriptionId,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      usage,
      limits: PLAN_LIMITS[plan],
    };
  }

  async createSubscription(tenantId: string, dto: CreateSubscriptionDto): Promise<BillingResponseDto> {
    if (!this.stripe) throw new BadRequestException('Stripe non configuré');

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException(`Tenant non trouvé: ${tenantId}`);

    let customerId = tenant.stripeCustomerId;

    if (!customerId) {
      const customer = await this.stripe.customers.create({
        name: tenant.name,
        metadata: { tenantId },
      });
      customerId = customer.id;
      await this.prisma.tenant.update({ where: { id: tenantId }, data: { stripeCustomerId: customerId } });
    }

    await this.stripe.paymentMethods.attach(dto.paymentMethodId, { customer: customerId });
    await this.stripe.customers.update(customerId, { invoice_settings: { default_payment_method: dto.paymentMethodId } });

    const priceIds = getStripePriceIds(this.configService);
    const priceId = priceIds[dto.plan];
    if (!priceId) throw new BadRequestException('Plan gratuit, pas d\'abonnement Stripe requis');

    const subscription = await this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        plan: this.mapBillingPlanToPrismaPlan(dto.plan),
        stripeSubscriptionId: subscription.id,
      },
    });

    this.logger.log(`Abonnement créé pour tenant ${tenantId}: ${subscription.id}`);
    return this.getBillingInfo(tenantId);
  }

  async cancelSubscription(tenantId: string): Promise<void> {
    if (!this.stripe) throw new BadRequestException('Stripe non configuré');

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException(`Tenant non trouvé: ${tenantId}`);
    if (tenant.stripeSubscriptionId) {
      await this.stripe.subscriptions.cancel(tenant.stripeSubscriptionId);
    }

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { plan: 'FREE', stripeSubscriptionId: null },
    });

    this.logger.log(`Abonnement annulé pour tenant ${tenantId}`);
  }

  async recordUsage(tenantId: string, flowsExecuted: number = 0, recordsProcessed: number = 0, apiCallsMade: number = 0): Promise<void> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    await this.prisma.usageMetric.upsert({
      where: { tenantId_periodStart: { tenantId, periodStart } },
      create: { tenantId, periodStart, periodEnd, flowsExecuted, recordsProcessed, apiCallsMade },
      update: { flowsExecuted: { increment: flowsExecuted }, recordsProcessed: { increment: recordsProcessed }, apiCallsMade: { increment: apiCallsMade } },
    });
  }

  async getUsageHistory(tenantId: string, months: number = 6): Promise<Array<{ periodStart: Date; periodEnd: Date; flowsExecuted: number; recordsProcessed: number; apiCallsMade: number }>> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const metrics = await this.prisma.usageMetric.findMany({
      where: { tenantId, periodStart: { gte: startDate } },
      orderBy: { periodStart: 'desc' },
    });

    return metrics.map(m => ({
      periodStart: m.periodStart,
      periodEnd: m.periodEnd,
      flowsExecuted: m.flowsExecuted,
      recordsProcessed: Number(m.recordsProcessed),
      apiCallsMade: m.apiCallsMade,
    }));
  }

  async getInvoices(tenantId: string): Promise<InvoiceResponseDto[]> {
    const invoices = await this.prisma.billingInvoice.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return invoices.map(inv => this.mapInvoiceToDto(inv));
  }

  /**
   * Récupère une facture par ID (équivalent ancien EDI-Connect export_json).
   */
  async getInvoiceById(tenantId: string, invoiceId: string): Promise<InvoiceResponseDto | null> {
    const inv = await this.prisma.billingInvoice.findFirst({
      where: { id: invoiceId, tenantId },
    });
    return inv ? this.mapInvoiceToDto(inv) : null;
  }

  private mapInvoiceToDto(inv: {
    id: string;
    totalAmount: unknown;
    status: string;
    periodStart: Date;
    periodEnd: Date;
    createdAt: Date;
  }): InvoiceResponseDto {
    return {
      id: inv.id,
      amount: Number(inv.totalAmount),
      currency: 'EUR',
      status: inv.status,
      periodStart: inv.periodStart,
      periodEnd: inv.periodEnd,
      pdfUrl: undefined,
      createdAt: inv.createdAt,
    };
  }

  async checkQuota(tenantId: string, metricType: string): Promise<{ allowed: boolean; current: number; limit: number }> {
    const billing = await this.getBillingInfo(tenantId);
    const current = billing.usage[metricType as keyof typeof billing.usage] || 0;
    const limit = billing.limits[metricType as keyof typeof billing.limits] || 0;

    if (limit === -1) return { allowed: true, current, limit: -1 };
    return { allowed: current < limit, current, limit };
  }

  async incrementUsage(tenantId: string, metricType: string, quantity: number = 1): Promise<void> {
    if (metricType === 'executions' || metricType === 'flows') {
      await this.recordUsage(tenantId, quantity, 0, 0);
    } else if (metricType === 'connectors') {
      await this.recordUsage(tenantId, 0, 0, quantity);
    }
  }

  private async getCurrentUsage(tenantId: string, periodStart: Date, _periodEnd: Date): Promise<{ flows: number; executions: number; connectors: number; storage: number }> {
    const metric = await this.prisma.usageMetric.findUnique({
      where: { tenantId_periodStart: { tenantId, periodStart } },
    });

    if (!metric) {
      return { flows: 0, executions: 0, connectors: 0, storage: 0 };
    }

    return {
      flows: metric.flowsExecuted,
      executions: metric.flowsExecuted,
      connectors: metric.apiCallsMade,
      storage: 0,
    };
  }

  async handleStripeWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!this.stripe) return;

    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) return;

    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);

      switch (event.type) {
        case 'invoice.paid':
          await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
          break;
        case 'invoice.payment_failed':
          await this.handleInvoiceFailed(event.data.object as Stripe.Invoice);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;
      }
    } catch (err) {
      this.logger.error(`Erreur webhook Stripe: ${(err as Error).message}`);
      throw err;
    }
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    const tenantId = invoice.metadata?.tenantId;
    if (!tenantId) return;

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return;

    await this.prisma.billingInvoice.create({
      data: {
        tenantId,
        stripeInvoiceId: invoice.id,
        periodStart: new Date(invoice.period_start * 1000),
        periodEnd: new Date(invoice.period_end * 1000),
        plan: tenant.plan,
        baseAmount: invoice.amount_paid / 100,
        usageAmount: 0,
        totalAmount: invoice.amount_paid / 100,
        status: 'PAID',
        paidAt: new Date(),
      },
    });
  }

  private async handleInvoiceFailed(invoice: Stripe.Invoice): Promise<void> {
    const tenantId = invoice.metadata?.tenantId;
    if (!tenantId) return;

    this.logger.warn(`Paiement échoué pour tenant ${tenantId}`);
  }

  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
    if (session.mode !== 'subscription') return;

    const tenantId = session.metadata?.tenantId;
    const planRaw = session.metadata?.plan;
    if (!tenantId || !planRaw) {
      this.logger.warn('checkout.session.completed sans tenantId ou plan dans les métadonnées');
      return;
    }

    const plan = planRaw as BillingPlan;
    if (!Object.values(BillingPlan).includes(plan) || plan === BillingPlan.FREE) return;

    const subRef = session.subscription;
    const subscriptionId = typeof subRef === 'string' ? subRef : subRef?.id;
    if (!subscriptionId) return;

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        plan: this.mapBillingPlanToPrismaPlan(plan),
        stripeSubscriptionId: subscriptionId,
      },
    });

    this.logger.log(`Checkout complété pour tenant ${tenantId}, abonnement ${subscriptionId}, plan ${plan}`);
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    let tenantId: string | undefined = subscription.metadata?.tenantId;
    if (!tenantId) {
      const tenant = await this.prisma.tenant.findFirst({
        where: { stripeSubscriptionId: subscription.id },
      });
      tenantId = tenant?.id;
    }
    if (!tenantId) return;

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { plan: 'FREE', stripeSubscriptionId: null },
    });
  }

  private mapPlanToBillingPlan(plan: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE'): BillingPlan {
    const mapping: Record<string, BillingPlan> = {
      FREE: BillingPlan.FREE,
      STARTER: BillingPlan.STARTER,
      PRO: BillingPlan.PRO,
      ENTERPRISE: BillingPlan.ENTERPRISE,
    };
    return mapping[plan] ?? BillingPlan.FREE;
  }

  private mapBillingPlanToPrismaPlan(plan: BillingPlan): 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE' {
    const mapping: Record<BillingPlan, 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE'> = {
      [BillingPlan.FREE]: 'FREE',
      [BillingPlan.STARTER]: 'STARTER',
      [BillingPlan.PRO]: 'PRO',
      [BillingPlan.ENTERPRISE]: 'ENTERPRISE',
    };
    return mapping[plan];
  }

  async createPortalSession(tenantId: string, returnUrl: string): Promise<{ url: string }> {
    if (!this.stripe) throw new BadRequestException('Stripe non configuré');

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException(`Tenant non trouvé: ${tenantId}`);
    if (!tenant.stripeCustomerId) throw new BadRequestException('Aucun client Stripe pour ce tenant');

    const session = await this.stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: session.url ?? '' };
  }

  async createCheckoutSession(tenantId: string, dto: CreateCheckoutSessionDto): Promise<{ url: string }> {
    if (!this.stripe) throw new BadRequestException('Stripe non configuré');
    if (dto.plan === BillingPlan.FREE) {
      throw new BadRequestException('Le plan gratuit ne nécessite pas de paiement Stripe');
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException(`Tenant non trouvé: ${tenantId}`);

    const priceIds = getStripePriceIds(this.configService);
    const priceId = priceIds[dto.plan];
    if (!priceId) {
      throw new BadRequestException(`Prix Stripe non configuré pour le plan ${dto.plan}`);
    }

    let customerId = tenant.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        name: tenant.name,
        metadata: { tenantId },
      });
      customerId = customer.id;
      await this.prisma.tenant.update({ where: { id: tenantId }, data: { stripeCustomerId: customerId } });
    }

    const successUrl = dto.successUrl.includes('{CHECKOUT_SESSION_ID}')
      ? dto.successUrl
      : `${dto.successUrl}${dto.successUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`;

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: dto.cancelUrl,
      metadata: { tenantId, plan: dto.plan },
      subscription_data: { metadata: { tenantId, plan: dto.plan } },
      allow_promotion_codes: true,
    });

    return { url: session.url ?? '' };
  }

  getPlans(): Array<{ plan: BillingPlan; limits: { flows: number; executions: number; connectors: number; storage: number }; priceId: string }> {
    const priceIds = getStripePriceIds(this.configService);
    return ([BillingPlan.FREE, BillingPlan.STARTER, BillingPlan.PRO, BillingPlan.ENTERPRISE] as const).map((plan) => ({
      plan,
      limits: PLAN_LIMITS[plan],
      priceId: priceIds[plan] || '',
    }));
  }
}
