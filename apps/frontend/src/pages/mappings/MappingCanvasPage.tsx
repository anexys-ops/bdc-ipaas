import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button, Card, CardContent, CardHeader, CardTitle } from '../../components/ui';
import { MappingFieldsDnd } from '../../components/mapping';
import { connectorsApi } from '../../api/connectors';
import { marketplaceApi } from '../../api/marketplace';
import { mappingsApi } from '../../api/mappings';
import type { PreviewResponse } from '../../api/mappings';
import { getConnectorLogoUrl } from '../../lib/connector-logos';
import {
  Database, Upload, Loader2, ChevronDown, ChevronRight,
  GripVertical, ArrowRight, Play, CheckCircle, XCircle,
  AlertCircle, Wand2, Search,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ConfiguredConnector, MappingRule } from '../../types';

const SOURCE_NODE_ID = 'source';
const DEST_NODE_ID = 'dest';

const WRITE_MODES = [
  { value: 'CREATE', label: 'Créer', desc: 'Toujours créer un nouvel enregistrement' },
  { value: 'UPDATE', label: 'Mettre à jour', desc: 'Chercher par matchField et mettre à jour si trouvé, sinon ignorer' },
  { value: 'UPSERT', label: 'Créer ou MAJ', desc: 'Mettre à jour si trouvé, sinon créer (recommandé)' },
  { value: 'SKIP', label: 'Ignorer doublons', desc: 'Créer uniquement si non trouvé, sinon ignorer' },
] as const;
type WriteMode = (typeof WRITE_MODES)[number]['value'];

type DropPayload = {
  connectorId: string;
  connectorName: string;
  connectorType: string;
  operationId: string;
  operationLabel: string;
  schema: Record<string, unknown>;
  isSource: boolean;
};

function flattenSchema(schema: Record<string, unknown>, prefix = ''): string[] {
  if (!schema || typeof schema !== 'object') return [];
  const props = (schema['properties'] as Record<string, unknown>) ?? schema;
  const fields: string[] = [];
  for (const [key, val] of Object.entries(props)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    fields.push(fullKey);
    if (val && typeof val === 'object') {
      const nested = (val as Record<string, unknown>)['properties'] as Record<string, unknown> | undefined;
      if (nested) fields.push(...flattenSchema(nested, fullKey));
    }
  }
  return fields;
}

function SourceNodeComponent({ data }: NodeProps<{ payload?: DropPayload }>) {
  const fields = data?.payload ? flattenSchema(data.payload.schema) : [];
  return (
    <div
      className="w-[260px] rounded-2xl border-2 border-emerald-500/50 bg-white shadow-lg"
      onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.outline = '3px solid #10b981'; }}
      onDragLeave={(e) => { e.currentTarget.style.outline = ''; }}
      onDrop={(e) => {
        e.preventDefault(); e.currentTarget.style.outline = '';
        const raw = e.dataTransfer.getData('application/json');
        if (!raw) return;
        try {
          const p = JSON.parse(raw) as DropPayload;
          if (!p.isSource) { toast.error('Déposez une opération source (vert) ici'); return; }
          (window as unknown as Record<string, unknown>).__dropPayload = { ...p, isSource: true };
          (window as unknown as Record<string, unknown>).__dropTarget = SOURCE_NODE_ID;
          window.dispatchEvent(new CustomEvent('connector-drop'));
        } catch { /* ignore */ }
      }}
    >
      <div className="bg-emerald-500 text-white px-4 py-2.5 rounded-t-2xl flex items-center gap-2">
        <Database className="w-4 h-4 shrink-0" />
        <span className="font-semibold text-sm">Source</span>
      </div>
      <div className="p-3 max-h-[200px] overflow-auto">
        {data?.payload ? (
          <>
            <p className="font-semibold text-slate-800 text-sm truncate">{data.payload.connectorName}</p>
            <p className="text-xs text-slate-500 mb-2 truncate">{data.payload.operationLabel}</p>
            <div className="space-y-0.5">
              {fields.map((f) => (
                <div key={f} className="text-xs text-emerald-800 flex items-center gap-1.5 bg-emerald-50 rounded px-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span className="truncate">{f}</span>
                </div>
              ))}
              {fields.length === 0 && <p className="text-xs text-slate-400">Aucun champ détecté</p>}
            </div>
          </>
        ) : (
          <p className="text-xs text-slate-400 text-center py-6">
            Glissez une opération <span className="text-emerald-600 font-semibold">source</span> ici
          </p>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white" />
    </div>
  );
}

function DestNodeComponent({ data }: NodeProps<{ payload?: DropPayload }>) {
  const fields = data?.payload ? flattenSchema(data.payload.schema) : [];
  return (
    <div
      className="w-[260px] rounded-2xl border-2 border-blue-500/50 bg-white shadow-lg"
      onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.outline = '3px solid #3b82f6'; }}
      onDragLeave={(e) => { e.currentTarget.style.outline = ''; }}
      onDrop={(e) => {
        e.preventDefault(); e.currentTarget.style.outline = '';
        const raw = e.dataTransfer.getData('application/json');
        if (!raw) return;
        try {
          const p = JSON.parse(raw) as DropPayload;
          if (p.isSource) { toast.error('Déposez une opération destination (bleu) ici'); return; }
          (window as unknown as Record<string, unknown>).__dropPayload = { ...p, isSource: false };
          (window as unknown as Record<string, unknown>).__dropTarget = DEST_NODE_ID;
          window.dispatchEvent(new CustomEvent('connector-drop'));
        } catch { /* ignore */ }
      }}
    >
      <div className="bg-blue-500 text-white px-4 py-2.5 rounded-t-2xl flex items-center gap-2">
        <Upload className="w-4 h-4 shrink-0" />
        <span className="font-semibold text-sm">Destination</span>
      </div>
      <div className="p-3 max-h-[200px] overflow-auto">
        {data?.payload ? (
          <>
            <p className="font-semibold text-slate-800 text-sm truncate">{data.payload.connectorName}</p>
            <p className="text-xs text-slate-500 mb-2 truncate">{data.payload.operationLabel}</p>
            <div className="space-y-0.5">
              {fields.map((f) => (
                <div key={f} className="text-xs text-blue-800 flex items-center gap-1.5 bg-blue-50 rounded px-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                  <span className="truncate">{f}</span>
                </div>
              ))}
              {fields.length === 0 && <p className="text-xs text-slate-400">Aucun champ détecté</p>}
            </div>
          </>
        ) : (
          <p className="text-xs text-slate-400 text-center py-6">
            Glissez une opération <span className="text-blue-600 font-semibold">destination</span> ici
          </p>
        )}
      </div>
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white" />
    </div>
  );
}

const nodeTypes = { source: SourceNodeComponent, destination: DestNodeComponent };

function ConnectorPaletteItem({ connector }: { connector: ConfiguredConnector }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: detail, isLoading } = useQuery({
    queryKey: ['marketplace', connector.type],
    queryFn: () => marketplaceApi.getDetail(connector.type),
    enabled: open,
  });
  const filter = (label: string) => !search || label.toLowerCase().includes(search.toLowerCase());
  const sourceOps = detail?.sourceOperations?.filter((op) => filter(op.label)) ?? [];
  const destOps = detail?.destinationOperations?.filter((op) => filter(op.label)) ?? [];

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-50"
      >
        {open ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
        {getConnectorLogoUrl(connector.type, connector.connectorInfo?.icon) && (
          <img
            src={getConnectorLogoUrl(connector.type, connector.connectorInfo?.icon)}
            alt=""
            className="w-5 h-5 rounded object-contain shrink-0"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        )}
        <span className="font-medium text-slate-800 truncate text-sm flex-1">{connector.name}</span>
        <span className="text-xs text-slate-400 shrink-0">{connector.connectorInfo?.name ?? connector.type}</span>
      </button>
      {open && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-2 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher un endpoint..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:ring-1 focus:ring-blue-400 outline-none"
            />
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-slate-400" /></div>
          ) : (
            <>
              {sourceOps.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">↑ Entrée source ({sourceOps.length})</p>
                  {sourceOps.map((op) => (
                    <div key={op.id} draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify({ connectorId: connector.id, connectorName: connector.name, connectorType: connector.type, operationId: op.id, operationLabel: op.label, schema: op.outputSchema ?? {}, isSource: true } as DropPayload));
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200/80 cursor-grab text-sm text-emerald-800 hover:bg-emerald-100 mb-1 select-none">
                      <GripVertical className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="truncate text-xs">{op.label}</span>
                    </div>
                  ))}
                </div>
              )}
              {destOps.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1 mt-2">↓ Sortie destination ({destOps.length})</p>
                  {destOps.map((op) => (
                    <div key={op.id} draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify({ connectorId: connector.id, connectorName: connector.name, connectorType: connector.type, operationId: op.id, operationLabel: op.label, schema: op.inputSchema ?? {}, isSource: false } as DropPayload));
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-blue-50 border border-blue-200/80 cursor-grab text-sm text-blue-800 hover:bg-blue-100 mb-1 select-none">
                      <GripVertical className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="truncate text-xs">{op.label}</span>
                    </div>
                  ))}
                </div>
              )}
              {sourceOps.length === 0 && destOps.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-2">{search ? 'Aucun résultat' : 'Aucune opération'}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function PreviewPanel({ rules, sourceSchema, onClose }: { rules: MappingRule[]; sourceSchema: Record<string, unknown>; onClose: () => void }) {
  const [sampleJson, setSampleJson] = useState(() => {
    const sample: Record<string, unknown> = {};
    const fields = flattenSchema(sourceSchema).slice(0, 8);
    for (const f of fields) {
      const parts = f.split('.');
      let obj = sample;
      for (let i = 0; i < parts.length - 1; i++) { if (!obj[parts[i]]) obj[parts[i]] = {}; obj = obj[parts[i]] as Record<string, unknown>; }
      obj[parts[parts.length - 1]] = `exemple_${parts[parts.length - 1]}`;
    }
    return JSON.stringify([sample], null, 2);
  });
  const [result, setResult] = useState<PreviewResponse | null>(null);
  const [jsonError, setJsonError] = useState('');
  const previewMutation = useMutation({
    mutationFn: () => {
      let parsed: Record<string, unknown>[];
      try { parsed = JSON.parse(sampleJson); if (!Array.isArray(parsed)) parsed = [parsed]; setJsonError(''); }
      catch { throw new Error('JSON invalide'); }
      return mappingsApi.preview({ rules, sampleData: parsed });
    },
    onSuccess: (data) => setResult(data),
    onError: (e: Error) => setJsonError(e.message),
  });
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h3 className="font-semibold text-slate-900">Prévisualisation du mapping</h3>
            <p className="text-xs text-slate-500 mt-0.5">{rules.length} règle(s) — modifiez les données et cliquez Exécuter</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 text-xl font-bold">×</button>
        </div>
        <div className="flex-1 overflow-auto p-6 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Données d'entrée (JSON)</label>
            <textarea value={sampleJson} onChange={(e) => setSampleJson(e.target.value)} rows={14}
              className="w-full font-mono text-xs border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-400/50 outline-none resize-none" spellCheck={false} />
            {jsonError && <p className="text-xs text-red-500 mt-1">{jsonError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Résultat transformé</label>
            {result ? (
              <div className="space-y-3">
                <div className="flex gap-4 text-xs">
                  <span className="flex items-center gap-1 text-emerald-600"><CheckCircle className="w-3.5 h-3.5" />{result.stats.success} OK</span>
                  {result.stats.failed > 0 && <span className="flex items-center gap-1 text-red-500"><XCircle className="w-3.5 h-3.5" />{result.stats.failed} erreur(s)</span>}
                </div>
                {result.results.map((r, i) => (
                  <div key={i} className={`rounded-xl border p-3 text-xs ${r.success ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      {r.success ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                      <span className="font-medium">Ligne {r.index + 1}</span>
                    </div>
                    {r.error && <p className="text-red-600 mb-1">{r.error}</p>}
                    {r.data && <pre className="overflow-auto font-mono text-slate-700 text-xs max-h-32">{JSON.stringify(r.data, null, 2)}</pre>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-52 text-slate-400 border border-dashed border-slate-200 rounded-xl gap-2">
                <Play className="w-6 h-6" /><p className="text-sm">Cliquez "Exécuter" pour voir le résultat</p>
              </div>
            )}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
          <Button onClick={() => previewMutation.mutate()} disabled={previewMutation.isPending}>
            {previewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}Exécuter
          </Button>
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </div>
      </div>
    </div>
  );
}

export function MappingCanvasPage() {
  const [sourcePayload, setSourcePayload] = useState<DropPayload | null>(null);
  const [destPayload, setDestPayload] = useState<DropPayload | null>(null);
  const [mappingName, setMappingName] = useState('');
  const [rules, setRules] = useState<MappingRule[]>([]);
  const [writeMode, setWriteMode] = useState<WriteMode>('CREATE');
  const [matchField, setMatchField] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [canvasHeight, setCanvasHeight] = useState(280);
  const isDragging = useRef(false);

  const onDividerDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    const startY = e.clientY, startH = canvasHeight;
    const onMove = (ev: MouseEvent) => { if (isDragging.current) setCanvasHeight(Math.max(150, Math.min(600, startH + ev.clientY - startY))); };
    const onUp = () => { isDragging.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [canvasHeight]);

  const { data: connectors, isLoading: connectorsLoading } = useQuery({ queryKey: ['connectors'], queryFn: () => connectorsApi.getAll() });

  const initialNodes: Node[] = [
    { id: SOURCE_NODE_ID, type: 'source', position: { x: 50, y: 40 }, data: { payload: null } },
    { id: DEST_NODE_ID, type: 'destination', position: { x: 430, y: 40 }, data: { payload: null } },
  ];
  const initialEdges: Edge[] = [
    { id: 'e-main', source: SOURCE_NODE_ID, target: DEST_NODE_ID, type: 'smoothstep', animated: true, style: { stroke: '#94a3b8', strokeWidth: 2 } },
  ];
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onDropEvent = useCallback(() => {
    const payload = (window as unknown as Record<string, unknown>).__dropPayload as DropPayload | undefined;
    const target = (window as unknown as Record<string, unknown>).__dropTarget as string | undefined;
    if (!payload || !target) return;
    if (target === SOURCE_NODE_ID) setSourcePayload(payload);
    else setDestPayload(payload);
  }, []);

  useEffect(() => { window.addEventListener('connector-drop', onDropEvent); return () => window.removeEventListener('connector-drop', onDropEvent); }, [onDropEvent]);

  useEffect(() => {
    setNodes((nds) => nds.map((n) => {
      if (n.id === SOURCE_NODE_ID) return { ...n, data: { payload: sourcePayload } };
      if (n.id === DEST_NODE_ID) return { ...n, data: { payload: destPayload } };
      return n;
    }));
  }, [sourcePayload, destPayload, setNodes]);

  const sourceSchema = sourcePayload?.schema ?? {};
  const destSchema = destPayload?.schema ?? {};
  const sourceFields = flattenSchema(sourceSchema);
  const destFields = flattenSchema(destSchema);

  // Auto-mapping quand source+destination définis sans règles
  useEffect(() => {
    if (!sourcePayload || !destPayload || rules.length > 0) return;
    const srcSet = new Set(sourceFields);
    const autoRules: MappingRule[] = destFields.filter((f) => srcSet.has(f)).map((f) => ({ destinationField: f, type: 'from' as const, sourceField: f }));
    if (autoRules.length > 0) { setRules(autoRules); toast.success(`${autoRules.length} champ(s) mappé(s) automatiquement`, { duration: 2500 }); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourcePayload?.operationId, destPayload?.operationId]);

  /** Schémas au format "properties" pour l’API (si schéma complet type+properties, on envoie properties). */
  const sourceSchemaForSave =
    sourceSchema?.properties && typeof sourceSchema.properties === 'object'
      ? (sourceSchema.properties as Record<string, unknown>)
      : sourceSchema;
  const destSchemaForSave =
    destSchema?.properties && typeof destSchema.properties === 'object'
      ? (destSchema.properties as Record<string, unknown>)
      : destSchema;

  const canSave = !!mappingName.trim() && !!sourcePayload && !!destPayload && rules.length > 0;
  const createMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: mappingName.trim(),
        sourceSchema: sourceSchemaForSave,
        destinationSchema: destSchemaForSave,
        rules,
        writeMode,
        ...(matchField.trim() && { matchField: matchField.trim() }),
        ...(sourcePayload?.connectorId && { sourceConnectorId: sourcePayload.connectorId }),
        ...(sourcePayload?.operationId && { sourceOperationId: sourcePayload.operationId }),
        ...(destPayload?.connectorId && { destinationConnectorId: destPayload.connectorId }),
        ...(destPayload?.operationId && { destinationOperationId: destPayload.operationId }),
      };
      return mappingsApi.create(payload);
    },
    onSuccess: () => toast.success('Mapping enregistré avec succès'),
    onError: (e: Error) => toast.error(e.message),
  });

  const writeModeInfo = WRITE_MODES.find((m) => m.value === writeMode)!;

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-100">
      {/* Palette gauche */}
      <aside className="w-72 border-r border-slate-200 bg-white flex flex-col overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="font-semibold text-slate-800 text-sm">Connecteurs disponibles</h2>
          <p className="text-xs text-slate-500 mt-0.5">Ouvrez un connecteur et glissez un endpoint.</p>
        </div>
        <div className="flex-1 overflow-auto p-3 space-y-2">
          {connectorsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-7 h-7 animate-spin text-slate-400" /></div>
          ) : !connectors?.length ? (
            <div className="text-center py-8">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Aucun connecteur configuré.</p>
              <a href="/connectors/new" className="text-xs text-blue-500 underline mt-1 block">Ajouter un connecteur</a>
            </div>
          ) : connectors.map((c) => <ConnectorPaletteItem key={c.id} connector={c} />)}
        </div>
      </aside>

      {/* Zone principale */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Canvas ReactFlow redimensionnable */}
        <div style={{ height: canvasHeight }} className="border-b border-slate-200 bg-slate-50 flex-shrink-0">
          <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.25 }} proOptions={{ hideAttribution: true }}>
            <Background gap={20} color="#e2e8f0" />
            <Controls showInteractive={false} />
            <MiniMap nodeStrokeWidth={3} zoomable pannable />
          </ReactFlow>
        </div>
        {/* Poignée de redimensionnement */}
        <div className="h-2.5 bg-slate-200 hover:bg-blue-300 cursor-row-resize flex items-center justify-center group transition-colors flex-shrink-0"
          onMouseDown={onDividerDown} title="Glisser pour redimensionner">
          <div className="w-12 h-1 rounded-full bg-slate-400 group-hover:bg-blue-500 transition-colors" />
        </div>

        {/* Zone mapping */}
        <div className="flex-1 overflow-auto">
          {sourcePayload && destPayload ? (
            <div className="max-w-5xl mx-auto p-4 space-y-4">
              {/* Nom + actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <input placeholder="Nom du mapping (ex: Sellsy → EBP Clients)" value={mappingName}
                  onChange={(e) => setMappingName(e.target.value)}
                  className="flex-1 min-w-48 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-400/50 outline-none" />
                <Button variant="outline" size="sm" onClick={() => {
                  const srcSet = new Set(sourceFields);
                  const newRules: MappingRule[] = destFields.filter((f) => srcSet.has(f)).map((f) => ({ destinationField: f, type: 'from' as const, sourceField: f }));
                  setRules(newRules); toast.success(`${newRules.length} règle(s) générées`);
                }}>
                  <Wand2 className="w-4 h-4 mr-1.5" />Auto-map
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowPreview(true)} disabled={rules.length === 0}>
                  <Play className="w-4 h-4 mr-1.5" />Tester
                </Button>
                <Button size="sm" onClick={() => createMutation.mutate()} disabled={!canSave || createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}Enregistrer
                </Button>
              </div>

              {/* Mode d'écriture */}
              <Card className="border-slate-200">
                <CardContent className="pt-4 pb-3">
                  <div className="flex flex-wrap gap-4 items-start">
                    <div className="flex-1 min-w-48">
                      <p className="text-xs font-semibold text-slate-600 mb-2">Mode d'écriture</p>
                      <div className="flex flex-wrap gap-1.5">
                        {WRITE_MODES.map((m) => (
                          <button key={m.value} type="button" onClick={() => setWriteMode(m.value)} title={m.desc}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${writeMode === m.value ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                            {m.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-slate-500 mt-1.5">{writeModeInfo.desc}</p>
                    </div>
                    {writeMode !== 'CREATE' && (
                      <div className="flex-1 min-w-40">
                        <p className="text-xs font-semibold text-slate-600 mb-2">Champ identifiant (matchField)</p>
                        <select value={matchField} onChange={(e) => setMatchField(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-400 outline-none">
                          <option value="">-- Sélectionner --</option>
                          {destFields.map((f) => <option key={f} value={f}>{f}</option>)}
                        </select>
                        <p className="text-xs text-slate-400 mt-1">Champ pour détecter les doublons côté destination.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {rules.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span>{rules.length} règle(s) configurée(s)</span>
                  <button onClick={() => setRules([])} className="text-xs text-red-400 hover:text-red-600 ml-auto">Tout effacer</button>
                </div>
              )}

              <details className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2 text-xs text-blue-700">
                <summary className="cursor-pointer font-medium select-none">📋 Formules disponibles</summary>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                  <span><code>UPPER(source.nom)</code> → majuscules</span>
                  <span><code>LOWER(source.nom)</code> → minuscules</span>
                  <span><code>TRIM(source.texte)</code> → sans espaces</span>
                  <span><code>CONCAT(source.a, " ", source.b)</code></span>
                  <span><code>DATE_FORMAT(source.date, "DD/MM/YYYY")</code></span>
                  <span><code>NUMBER(source.montant)</code> → nombre</span>
                  <span><code>ROUND(source.prix, 2)</code> → arrondi</span>
                  <span><code>IF(source.actif === "1", "Oui", "Non")</code></span>
                </div>
              </details>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-slate-800 flex items-center gap-2 text-base">
                    <ArrowRight className="w-5 h-5" />Règles de correspondance
                  </CardTitle>
                  <p className="text-sm text-slate-500">Glissez un champ source vers un champ destination.</p>
                </CardHeader>
                <CardContent>
                  <MappingFieldsDnd sourceSchema={sourceSchema} destinationSchema={destSchema} rules={rules} onRulesChange={setRules} />
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <ArrowRight className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="font-semibold text-slate-700 mb-1">Configurez votre mapping</h3>
              <p className="text-sm text-slate-500 max-w-sm">
                Ouvrez un connecteur dans la palette de gauche, puis glissez une opération{' '}
                <span className="text-emerald-600 font-medium">source</span> et une{' '}
                <span className="text-blue-600 font-medium">destination</span> vers le canevas ci-dessus.
              </p>
            </div>
          )}
        </div>
      </main>

      {showPreview && sourcePayload && (
        <PreviewPanel rules={rules} sourceSchema={sourceSchema} onClose={() => setShowPreview(false)} />
      )}
    </div>
  );
}
