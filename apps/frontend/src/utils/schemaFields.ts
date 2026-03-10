import type { OperationSchemaJson } from '../types';

/**
 * Extrait les champs d'un schéma OpenAPI-like (properties + required).
 * Retourne la liste pour affichage (obligatoire en vert, facultatif en jaune)
 * et un objet { fieldName: type } pour le mapping.
 */
export function parseSchemaFields(schema: unknown): {
  fields: { name: string; type: string; required: boolean }[];
  schemaForMapping: Record<string, unknown>;
} {
  const s = schema as OperationSchemaJson | null | undefined;
  if (!s?.properties || typeof s.properties !== 'object') {
    return { fields: [], schemaForMapping: {} };
  }
  const requiredSet = new Set((s.required ?? []) as string[]);
  const fields: { name: string; type: string; required: boolean }[] = [];
  const schemaForMapping: Record<string, unknown> = {};

  for (const [name, prop] of Object.entries(s.properties)) {
    if (!prop || typeof prop !== 'object') continue;
    const type = typeof (prop as { type?: string }).type === 'string'
      ? (prop as { type: string }).type
      : 'string';
    schemaForMapping[name] = type;
    fields.push({
      name,
      type,
      required: requiredSet.has(name),
    });
  }

  return { fields, schemaForMapping };
}
