import type { ConnectorOperation } from '../connectors/interfaces';

/**
 * Fallback pour connecteurs Sage (sage, sage-100, sage-x3, sage-psc).
 * Quand le connecteur n'a pas d'opérations dans son openapi, on utilise cette liste.
 * Actuellement vide : les opérations Sage détaillées ont été retirées (schémas inline trop complexes).
 */
export const SAGE_CONNECTOR_IDS = ['sage', 'sage-100', 'sage-x3', 'sage-psc'] as const;

export const SAGE_OPERATIONS_FALLBACK: ConnectorOperation[] = [];
