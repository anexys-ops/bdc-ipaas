interface SchemaFieldsListProps {
  /** Schéma OpenAPI-like : { required?: string[], properties?: Record<string, { type?, description?, default? }> } */
  schema?: Record<string, unknown> | null;
  /** Titre (ex: "Champs à remplir", "Champs retournés") */
  title: string;
  /** Type d'opération pour le libellé (source = sortie, destination = entrée) */
  variant?: 'input' | 'output';
  className?: string;
}

function getPropertiesFromSchema(schema: Record<string, unknown>): Record<string, { type?: string; description?: string; default?: unknown }> {
  const props = schema.properties;
  if (props && typeof props === 'object') return props as Record<string, { type?: string; description?: string; default?: unknown }>;
  return {};
}

function getRequiredFromSchema(schema: Record<string, unknown>): string[] {
  const r = schema.required;
  if (Array.isArray(r)) return r as string[];
  return [];
}

export function SchemaFieldsList({ schema, title, variant: _variant = 'output', className = '' }: SchemaFieldsListProps) {
  if (!schema || typeof schema !== 'object') return null;

  const properties = getPropertiesFromSchema(schema);
  const required = getRequiredFromSchema(schema);
  const keys = Object.keys(properties);
  if (keys.length === 0) return null;

  return (
    <div className={className}>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{title}</p>
      <ul className="space-y-1.5 text-sm">
        {keys.map((name) => {
          const prop = properties[name];
          const isRequired = required.includes(name);
          const type = typeof prop?.type === 'string' ? prop.type : 'string';
          const desc = typeof prop?.description === 'string' ? prop.description : undefined;
          return (
            <li key={name} className="flex flex-wrap items-baseline gap-2 py-1 border-b border-slate-100 last:border-0">
              <code className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                {name}
              </code>
              {isRequired && <span className="text-red-500 text-xs">requis</span>}
              <span className="text-slate-400 text-xs">{type}</span>
              {desc && <span className="text-slate-500 text-xs w-full mt-0.5">{desc}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
