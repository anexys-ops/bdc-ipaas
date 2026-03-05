/**
 * Fonctions disponibles dans les formules de mapping.
 * Usage dans les formules : UPPER(source.name), CONCAT(source.first, " ", source.last)
 */

/**
 * Convertit une chaîne en majuscules.
 */
export function UPPER(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).toUpperCase();
}

/**
 * Convertit une chaîne en minuscules.
 */
export function LOWER(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).toLowerCase();
}

/**
 * Concatène plusieurs valeurs.
 */
export function CONCAT(...values: unknown[]): string {
  return values.map((v) => (v === null || v === undefined ? '' : String(v))).join('');
}

/**
 * Supprime les espaces en début et fin de chaîne.
 */
export function TRIM(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

/**
 * Remplace des occurrences dans une chaîne.
 */
export function REPLACE(value: unknown, search: string, replacement: string): string {
  if (value === null || value === undefined) return '';
  return String(value).split(search).join(replacement);
}

/**
 * Divise une chaîne en tableau.
 */
export function SPLIT(value: unknown, separator: string): string[] {
  if (value === null || value === undefined) return [];
  return String(value).split(separator);
}

/**
 * Condition IF.
 */
export function IF<T, U>(condition: unknown, trueValue: T, falseValue: U): T | U {
  return condition ? trueValue : falseValue;
}

/**
 * Formate une date.
 */
export function DATE_FORMAT(value: unknown, format: string): string {
  if (value === null || value === undefined) return '';
  
  const date = value instanceof Date ? value : new Date(String(value));
  
  if (isNaN(date.getTime())) return '';
  
  const pad = (n: number): string => n.toString().padStart(2, '0');
  
  const replacements: Record<string, string> = {
    'YYYY': date.getFullYear().toString(),
    'MM': pad(date.getMonth() + 1),
    'DD': pad(date.getDate()),
    'HH': pad(date.getHours()),
    'mm': pad(date.getMinutes()),
    'ss': pad(date.getSeconds()),
  };
  
  let result = format;
  for (const [key, val] of Object.entries(replacements)) {
    result = result.replace(key, val);
  }
  
  return result;
}

/**
 * Extrait une sous-chaîne.
 */
export function SUBSTRING(value: unknown, start: number, length?: number): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return length !== undefined ? str.substring(start, start + length) : str.substring(start);
}

/**
 * Retourne la longueur d'une chaîne.
 */
export function LENGTH(value: unknown): number {
  if (value === null || value === undefined) return 0;
  return String(value).length;
}

/**
 * Convertit en nombre.
 */
export function NUMBER(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

/**
 * Arrondit un nombre.
 */
export function ROUND(value: unknown, decimals: number = 0): number {
  const num = NUMBER(value);
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}

/**
 * Retourne la valeur par défaut si null/undefined.
 */
export function COALESCE<T>(value: unknown, defaultValue: T): unknown | T {
  return value !== null && value !== undefined ? value : defaultValue;
}

/**
 * Vérifie si une valeur est vide.
 */
export function IS_EMPTY(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/**
 * Formate un nombre en devise.
 */
export function CURRENCY(value: unknown, currency: string = 'EUR', locale: string = 'fr-FR'): string {
  const num = NUMBER(value);
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(num);
  } catch {
    return `${num.toFixed(2)} ${currency}`;
  }
}

/**
 * Map des fonctions disponibles pour l'évaluation.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const FUNCTIONS: Record<string, (...args: any[]) => unknown> = {
  UPPER,
  LOWER,
  CONCAT,
  TRIM,
  REPLACE,
  SPLIT,
  IF,
  DATE_FORMAT,
  SUBSTRING,
  LENGTH,
  NUMBER,
  ROUND,
  COALESCE,
  IS_EMPTY,
  CURRENCY,
};
