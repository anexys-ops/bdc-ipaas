import type { SchemaFieldDisplay } from '../../types';

interface ConnectorSchemaFieldsProps {
  title: string;
  subtitle?: string;
  fields: SchemaFieldDisplay[];
  /** Couleur obligatoire (ex: vert) */
  requiredClassName?: string;
  /** Couleur facultatif (ex: jaune) */
  optionalClassName?: string;
}

export function ConnectorSchemaFields({
  title,
  subtitle,
  fields,
  requiredClassName = 'bg-emerald-100 border-emerald-300 text-emerald-800',
  optionalClassName = 'bg-amber-100 border-amber-300 text-amber-800',
}: ConnectorSchemaFieldsProps) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      <div className="mt-2 space-y-1.5">
        {fields.length === 0 ? (
          <p className="text-sm text-slate-400">Aucun champ dans ce schéma.</p>
        ) : (
          fields.map((f) => (
            <div
              key={f.name}
              className={`
                flex items-center justify-between px-3 py-2 rounded-lg border text-sm
                ${f.required ? requiredClassName : optionalClassName}
              `}
            >
              <span className="font-medium">{f.name}</span>
              <span className="text-xs opacity-80">{f.type}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
