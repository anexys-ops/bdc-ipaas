import { apiClient } from './client';

export type BillingPlan = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';

export type PlanLimits = {
  flows: number;
  executions: number;
  connectors: number;
  storage: number;
};

export type PlanInfo = {
  plan: BillingPlan;
  limits: PlanLimits;
  priceId: string;
};

export type BillingInfo = {
  tenantId: string;
  plan: BillingPlan;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  usage: PlanLimits;
  limits: PlanLimits;
};

export const billingApi = {
  getPlans: () => apiClient.get<PlanInfo[]>('/billing/plans', { skipAuth: true }),

  getBillingInfo: () => apiClient.get<BillingInfo>('/billing'),

  createCheckoutSession: (body: { plan: Exclude<BillingPlan, 'FREE'>; successUrl: string; cancelUrl: string }) =>
    apiClient.post<{ url: string }>('/billing/checkout-session', body),

  createPortalSession: (returnUrl: string) =>
    apiClient.post<{ url: string }>('/billing/portal', { returnUrl }),
};
