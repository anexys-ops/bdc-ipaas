/**
 * Types de règles de mapping supportées.
 */
export type RuleType = 'from' | 'formula' | 'value' | 'lookup';

/**
 * Règle de mapping pour un champ destination.
 */
export interface MappingRule {
  destinationField: string;
  type: RuleType;
  sourceField?: string;
  formula?: string;
  value?: unknown;
  lookupTable?: string;
  lookupKey?: string;
  lookupValue?: string;
  defaultValue?: unknown;
}

/**
 * Table de correspondance pour les lookups.
 */
export interface LookupTable {
  name: string;
  data: Record<string, Record<string, unknown>>;
}

/**
 * Configuration complète d'un mapping.
 */
export interface MappingConfig {
  rules: MappingRule[];
  lookupTables?: LookupTable[];
}

/**
 * Résultat de transformation d'un record.
 */
export interface TransformResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Contexte d'exécution pour les formules.
 */
export interface FormulaContext {
  record: Record<string, unknown>;
  lookupTables: Map<string, LookupTable>;
  index: number;
}
