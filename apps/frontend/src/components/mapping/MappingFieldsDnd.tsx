import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import { GripVertical, ArrowRight, Trash2 } from 'lucide-react';
import type { MappingRule } from '../../types';

const SOURCE_FIELD_PREFIX = 'source-';
const DEST_FIELD_PREFIX = 'dest-';

function getSourceId(field: string) {
  return `${SOURCE_FIELD_PREFIX}${field}`;
}
function getDestId(field: string) {
  return `${DEST_FIELD_PREFIX}${field}`;
}

function sourceIdToField(id: string): string | null {
  return id.startsWith(SOURCE_FIELD_PREFIX) ? id.slice(SOURCE_FIELD_PREFIX.length) : null;
}
function destIdToField(id: string): string | null {
  return id.startsWith(DEST_FIELD_PREFIX) ? id.slice(DEST_FIELD_PREFIX.length) : null;
}

/** Extrait les noms de champs d’un schéma (JSON Schema properties : clés = noms de champs). */
function schemaToFields(schema: Record<string, unknown>): string[] {
  if (!schema || typeof schema !== 'object') return [];
  const props = (schema.properties && typeof schema.properties === 'object')
    ? (schema.properties as Record<string, unknown>)
    : schema;
  return Object.keys(props);
}

interface DraggableFieldProps {
  id: string;
  label: string;
  isDragging?: boolean;
}

function DraggableField({ id, label, isDragging }: DraggableFieldProps) {
  const { attributes, listeners, setNodeRef, isDragging: dndDragging } = useDraggable({ id });
  const dragging = isDragging ?? dndDragging;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium
        bg-emerald-50 border-emerald-200/80 text-emerald-800
        cursor-grab active:cursor-grabbing
        ${dragging ? 'opacity-50 shadow-lg' : 'hover:bg-emerald-100'}
      `}
    >
      <GripVertical className="w-4 h-4 text-emerald-500 shrink-0" />
      {label}
    </div>
  );
}

interface DroppableFieldProps {
  id: string;
  label: string;
  sourceField?: string | null;
}

function DroppableField({ id, label, sourceField }: DroppableFieldProps) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`
        flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-sm
        min-h-[40px]
        ${isOver ? 'bg-primary-100 border-primary-400 ring-2 ring-primary-300' : 'bg-slate-50 border-slate-200'}
        ${sourceField ? 'text-slate-800' : 'text-slate-500'}
      `}
    >
      <span className="font-medium">{label}</span>
      {sourceField ? (
        <span className="flex items-center gap-1 text-xs text-primary-600">
          <ArrowRight className="w-3 h-3" />
          {sourceField}
        </span>
      ) : (
        <span className="text-xs">Déposer un champ</span>
      )}
    </div>
  );
}

interface SortableRuleRowProps {
  rule: MappingRule;
  index: number;
  onRemove: () => void;
}

function SortableRuleRow({ rule, index, onRemove }: SortableRuleRowProps) {
  const id = `rule-${rule.destinationField}-${index}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-2 p-2 rounded-lg border bg-white border-slate-200
        ${isDragging ? 'opacity-80 shadow-md z-10' : ''}
      `}
    >
      <button
        type="button"
        className="p-1 rounded text-slate-400 hover:text-slate-600 touch-none"
        {...attributes}
        {...listeners}
        aria-label="Réordonner"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <span className="flex-1 text-sm">
        <span className="text-slate-500">{rule.sourceField ?? '—'}</span>
        <ArrowRight className="w-4 h-4 inline mx-1 text-slate-400" />
        <span className="font-medium text-slate-800">{rule.destinationField}</span>
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="p-1 rounded text-slate-400 hover:text-red-600"
        aria-label="Supprimer la règle"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

export interface MappingFieldsDndProps {
  sourceSchema: Record<string, unknown>;
  destinationSchema: Record<string, unknown>;
  rules: MappingRule[];
  onRulesChange: (rules: MappingRule[]) => void;
}

export function MappingFieldsDnd({
  sourceSchema,
  destinationSchema,
  rules,
  onRulesChange,
}: MappingFieldsDndProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sourceFields = schemaToFields(sourceSchema);
  const destFields = schemaToFields(destinationSchema);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const sourceField = sourceIdToField(active.id as string);
    const destField = destIdToField(over.id as string);
    if (sourceField && destField) {
      const existing = rules.findIndex((r) => r.destinationField === destField);
      const newRule: MappingRule = {
        destinationField: destField,
        type: 'from',
        sourceField,
      };
      let next: MappingRule[];
      if (existing >= 0) {
        next = [...rules];
        next[existing] = newRule;
      } else {
        next = [...rules, newRule];
      }
      onRulesChange(next);
    }
  };

  const handleSortEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = rules.findIndex((_, i) => `rule-${rules[i].destinationField}-${i}` === active.id);
    const to = rules.findIndex((_, i) => `rule-${rules[i].destinationField}-${i}` === over.id);
    if (from >= 0 && to >= 0) {
      onRulesChange(arrayMove(rules, from, to));
    }
  };

  const removeRule = (destinationField: string) => {
    onRulesChange(rules.filter((r) => r.destinationField !== destinationField));
  };

  const sortableIds = rules.map((r, i) => `rule-${r.destinationField}-${i}`);
  const ruleByDest = new Map(rules.map((r) => [r.destinationField, r.sourceField ?? null]));

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={(e) => {
        if (sortableIds.includes(e.active.id as string)) {
          handleSortEnd(e);
        } else {
          handleDragEnd(e);
        }
      }}
      collisionDetection={closestCenter}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-2">Champs source</h4>
          <p className="text-xs text-slate-500 mb-3">Glissez un champ vers la destination</p>
          <div className="space-y-2">
            {sourceFields.map((field) => (
              <DraggableField key={field} id={getSourceId(field)} label={field} isDragging={activeId === getSourceId(field)} />
            ))}
            {sourceFields.length === 0 && (
              <p className="text-sm text-slate-400 py-2">Aucun champ (définir le schéma source en JSON)</p>
            )}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-2">Champs destination</h4>
          <p className="text-xs text-slate-500 mb-3">Déposez un champ source ici</p>
          <div className="space-y-2">
            {destFields.map((field) => (
              <DroppableField
                key={field}
                id={getDestId(field)}
                label={field}
                sourceField={ruleByDest.get(field) ?? null}
              />
            ))}
            {destFields.length === 0 && (
              <p className="text-sm text-slate-400 py-2">Aucun champ (définir le schéma destination en JSON)</p>
            )}
          </div>
        </div>
      </div>

      {rules.length > 0 && (
        <div className="mt-8">
          <h4 className="text-sm font-semibold text-slate-700 mb-2">Règles (glisser pour réordonner)</h4>
          <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {rules.map((rule, index) => (
                <SortableRuleRow
                  key={`${rule.destinationField}-${index}`}
                  rule={rule}
                  index={index}
                  onRemove={() => removeRule(rule.destinationField)}
                />
              ))}
            </div>
          </SortableContext>
        </div>
      )}

      <DragOverlay>
        {activeId && sourceIdToField(activeId) ? (
          <DraggableField id={activeId} label={sourceIdToField(activeId)!} isDragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
