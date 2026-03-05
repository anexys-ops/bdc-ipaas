import type {
  MappingConfig,
  MappingRule,
  LookupTable,
  TransformResult,
  FormulaContext,
} from './types';
import { evaluateFormula } from './formula-parser';

/**
 * Moteur de mapping qui transforme des records source vers des records destination.
 */
export class MappingEngine {
  private config: MappingConfig;
  private lookupTables: Map<string, LookupTable>;

  constructor(config: MappingConfig) {
    this.config = config;
    this.lookupTables = new Map();

    if (config.lookupTables) {
      for (const table of config.lookupTables) {
        this.lookupTables.set(table.name, table);
      }
    }
  }

  /**
   * Transforme un seul record.
   */
  transform(record: Record<string, unknown>, index: number = 0): TransformResult {
    const result: Record<string, unknown> = {};
    const fieldErrors: Record<string, string> = {};

    const context: FormulaContext = {
      record,
      lookupTables: this.lookupTables,
      index,
    };

    for (const rule of this.config.rules) {
      try {
        const value = this.applyRule(rule, context);
        result[rule.destinationField] = value;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        fieldErrors[rule.destinationField] = errorMessage;

        if (rule.defaultValue !== undefined) {
          result[rule.destinationField] = rule.defaultValue;
        }
      }
    }

    const hasErrors = Object.keys(fieldErrors).length > 0;

    return {
      success: !hasErrors,
      data: result,
      fieldErrors: hasErrors ? fieldErrors : undefined,
    };
  }

  /**
   * Transforme un tableau de records.
   */
  transformBatch(records: Record<string, unknown>[]): TransformResult[] {
    return records.map((record, index) => this.transform(record, index));
  }

  /**
   * Transforme un flux de records (générateur).
   */
  *transformStream(
    records: Iterable<Record<string, unknown>>,
  ): Generator<TransformResult, void, undefined> {
    let index = 0;
    for (const record of records) {
      yield this.transform(record, index);
      index++;
    }
  }

  /**
   * Applique une règle de mapping à un record.
   */
  private applyRule(rule: MappingRule, context: FormulaContext): unknown {
    switch (rule.type) {
      case 'from':
        return this.applyFromRule(rule, context);
      case 'formula':
        return this.applyFormulaRule(rule, context);
      case 'value':
        return rule.value;
      case 'lookup':
        return this.applyLookupRule(rule, context);
      default:
        throw new Error(`Type de règle inconnu: ${rule.type}`);
    }
  }

  /**
   * Applique une règle de type "from" (copie simple).
   */
  private applyFromRule(rule: MappingRule, context: FormulaContext): unknown {
    if (!rule.sourceField) {
      throw new Error('sourceField requis pour une règle "from"');
    }

    const value = this.getNestedValue(context.record, rule.sourceField);

    if (value === undefined && rule.defaultValue !== undefined) {
      return rule.defaultValue;
    }

    return value;
  }

  /**
   * Applique une règle de type "formula".
   */
  private applyFormulaRule(rule: MappingRule, context: FormulaContext): unknown {
    if (!rule.formula) {
      throw new Error('formula requis pour une règle "formula"');
    }

    return evaluateFormula(rule.formula, context);
  }

  /**
   * Applique une règle de type "lookup".
   */
  private applyLookupRule(rule: MappingRule, context: FormulaContext): unknown {
    if (!rule.lookupTable || !rule.lookupKey || !rule.lookupValue) {
      throw new Error('lookupTable, lookupKey et lookupValue requis pour une règle "lookup"');
    }

    const table = this.lookupTables.get(rule.lookupTable);
    if (!table) {
      throw new Error(`Table de lookup non trouvée: ${rule.lookupTable}`);
    }

    const keyValue = this.getNestedValue(context.record, rule.sourceField || rule.lookupKey);
    const keyString = String(keyValue);

    const row = table.data[keyString];
    if (!row) {
      if (rule.defaultValue !== undefined) {
        return rule.defaultValue;
      }
      return undefined;
    }

    return row[rule.lookupValue];
  }

  /**
   * Récupère une valeur imbriquée dans un objet.
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let value: unknown = obj;

    for (const part of parts) {
      if (value === null || value === undefined) return undefined;
      if (typeof value !== 'object') return undefined;
      value = (value as Record<string, unknown>)[part];
    }

    return value;
  }

  /**
   * Ajoute une table de lookup.
   */
  addLookupTable(table: LookupTable): void {
    this.lookupTables.set(table.name, table);
  }

  /**
   * Retourne la configuration actuelle.
   */
  getConfig(): MappingConfig {
    return this.config;
  }
}

/**
 * Crée une instance du moteur de mapping.
 */
export function createMappingEngine(config: MappingConfig): MappingEngine {
  return new MappingEngine(config);
}
