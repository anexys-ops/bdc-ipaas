import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsNumber, Min } from 'class-validator';

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
