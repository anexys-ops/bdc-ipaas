import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsNumber, Min, IsUrl } from 'class-validator';

export enum BillingPlan {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export const PLAN_LIMITS: Record<BillingPlan, { flows: number; executions: number; connectors: number; storage: number }> = {
  [BillingPlan.FREE]: { flows: 2, executions: 100, connectors: 2, storage: 100 },
  [BillingPlan.STARTER]: { flows: 10, executions: 5000, connectors: 10, storage: 1000 },
  [BillingPlan.PRO]: { flows: 50, executions: 50000, connectors: 50, storage: 10000 },
  [BillingPlan.ENTERPRISE]: { flows: -1, executions: -1, connectors: -1, storage: -1 },
};

export class CreateSubscriptionDto {
  @ApiProperty({ enum: BillingPlan }) @IsEnum(BillingPlan) plan!: BillingPlan;
  @ApiProperty() @IsString() paymentMethodId!: string;
}

export class CreatePortalSessionDto {
  @ApiProperty({ description: 'URL de retour après utilisation du portail Stripe' })
  @IsUrl()
  returnUrl!: string;
}

export class CreateCheckoutSessionDto {
  @ApiProperty({ enum: BillingPlan, description: 'Plan payant (hors FREE)' })
  @IsEnum(BillingPlan)
  plan!: BillingPlan;

  @ApiProperty({ description: 'URL après paiement réussi (peut contenir le littéral {CHECKOUT_SESSION_ID})' })
  @IsUrl({ require_tld: false })
  successUrl!: string;

  @ApiProperty({ description: 'URL si paiement annulé' })
  @IsUrl({ require_tld: false })
  cancelUrl!: string;
}

export class UsageRecordDto {
  @ApiProperty() @IsString() metricType!: string;
  @ApiProperty() @IsNumber() @Min(0) quantity!: number;
}

export class UsageMetricResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() metricType!: string;
  @ApiProperty() quantity!: number;
  @ApiProperty() periodStart!: Date;
  @ApiProperty() periodEnd!: Date;
}

export class BillingResponseDto {
  @ApiProperty() tenantId!: string;
  @ApiProperty({ enum: BillingPlan }) plan!: BillingPlan;
  @ApiProperty() stripeCustomerId!: string | null;
  @ApiProperty() stripeSubscriptionId!: string | null;
  @ApiProperty() currentPeriodStart!: Date;
  @ApiProperty() currentPeriodEnd!: Date;
  @ApiProperty() usage!: { flows: number; executions: number; connectors: number; storage: number };
  @ApiProperty() limits!: { flows: number; executions: number; connectors: number; storage: number };
}

export class PlanInfoDto {
  @ApiProperty({ enum: BillingPlan }) plan!: BillingPlan;
  @ApiProperty() limits!: { flows: number; executions: number; connectors: number; storage: number };
  @ApiProperty() priceId!: string;
}

export class InvoiceResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() amount!: number;
  @ApiProperty() currency!: string;
  @ApiProperty() status!: string;
  @ApiProperty() periodStart!: Date;
  @ApiProperty() periodEnd!: Date;
  @ApiProperty() pdfUrl?: string;
  @ApiProperty() createdAt!: Date;
}
