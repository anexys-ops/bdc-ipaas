/**
 * Estimation indicative mensuelle HT (non contractuelle).
 * Alignée sur `apps/api/src/modules/demo/quote-estimate.util.ts`.
 */
export function computeIndicativeMonthlyEuroHt(input: {
  connectors: number;
  executionsPerMonth: number;
  mappings: number;
}): number {
  const connectors = Math.max(1, Math.min(200, Math.round(input.connectors)));
  const executionsPerMonth = Math.max(1000, Math.min(10_000_000, Math.round(input.executionsPerMonth)));
  const mappings = Math.max(1, Math.min(500, Math.round(input.mappings)));

  const base = 99;
  const connectorCost = Math.max(0, connectors - 3) * 28;
  const excessExec = Math.max(0, executionsPerMonth - 5000);
  const volumeCost = Math.ceil(excessExec / 10_000) * 18;
  const mappingCost = Math.max(0, mappings - 2) * 42;
  const raw = base + connectorCost + volumeCost + mappingCost;
  return Math.round(raw / 5) * 5;
}

export const QUOTE_VOLUME_TIERS = [
  { label: 'Jusqu’à 5 000 exécutions / mois', value: 5000 },
  { label: '5 001 — 25 000', value: 25_000 },
  { label: '25 001 — 100 000', value: 100_000 },
  { label: '100 001 — 500 000', value: 500_000 },
  { label: 'Plus de 500 000', value: 750_000 },
] as const;
