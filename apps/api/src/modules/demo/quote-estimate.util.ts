/**
 * Estimation indicative mensuelle HT (non contractuelle).
 * Même logique que le simulateur frontend — à garder alignée avec
 * `apps/frontend/src/lib/quote-estimate.ts`.
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
