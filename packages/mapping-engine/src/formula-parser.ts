import { FUNCTIONS } from './functions';
import type { FormulaContext } from './types';

/**
 * Parse et évalue une formule de mapping.
 * Supporte : références source.field, fonctions UPPER(), CONCAT(), etc.
 */
export class FormulaParser {
  private context: FormulaContext;

  constructor(context: FormulaContext) {
    this.context = context;
  }

  /**
   * Évalue une formule et retourne le résultat.
   */
  evaluate(formula: string): unknown {
    try {
      const processed = this.processFormula(formula);
      return processed;
    } catch (error) {
      throw new Error(`Erreur d'évaluation de la formule "${formula}": ${error}`);
    }
  }

  /**
   * Traite une formule en remplaçant les références et en évaluant les fonctions.
   */
  private processFormula(formula: string): unknown {
    const trimmed = formula.trim();

    if (trimmed.startsWith('source.')) {
      return this.getSourceValue(trimmed.substring(7));
    }

    const funcMatch = trimmed.match(/^([A-Z_]+)\((.*)\)$/s);
    if (funcMatch) {
      const funcName = funcMatch[1];
      const argsString = funcMatch[2];
      return this.evaluateFunction(funcName, argsString);
    }

    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return parseFloat(trimmed);
    }

    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1);
    }

    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (trimmed === 'null') return null;

    return trimmed;
  }

  /**
   * Récupère une valeur depuis le record source.
   */
  private getSourceValue(path: string): unknown {
    const parts = path.split('.');
    let value: unknown = this.context.record;

    for (const part of parts) {
      if (value === null || value === undefined) return undefined;
      if (typeof value !== 'object') return undefined;
      value = (value as Record<string, unknown>)[part];
    }

    return value;
  }

  /**
   * Évalue une fonction avec ses arguments.
   */
  private evaluateFunction(funcName: string, argsString: string): unknown {
    const func = FUNCTIONS[funcName];
    if (!func) {
      throw new Error(`Fonction inconnue: ${funcName}`);
    }

    const args = this.parseArguments(argsString);
    const evaluatedArgs = args.map((arg) => this.processFormula(arg));

    return func(...evaluatedArgs);
  }

  /**
   * Parse les arguments d'une fonction en tenant compte des parenthèses imbriquées.
   */
  private parseArguments(argsString: string): string[] {
    const args: string[] = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < argsString.length; i++) {
      const char = argsString[i];

      if (!inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
        current += char;
      } else if (inString && char === stringChar) {
        inString = false;
        current += char;
      } else if (!inString && char === '(') {
        depth++;
        current += char;
      } else if (!inString && char === ')') {
        depth--;
        current += char;
      } else if (!inString && char === ',' && depth === 0) {
        args.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      args.push(current.trim());
    }

    return args;
  }
}

/**
 * Fonction utilitaire pour évaluer une formule.
 */
export function evaluateFormula(formula: string, context: FormulaContext): unknown {
  const parser = new FormulaParser(context);
  return parser.evaluate(formula);
}
