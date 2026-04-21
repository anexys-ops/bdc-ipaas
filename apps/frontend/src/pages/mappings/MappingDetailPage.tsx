import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui';
import { Button, Input } from '../../components/ui';
import { BackButton } from '../../components/layout';
import { mappingsApi } from '../../api/mappings';
import type { MappingRule } from '../../types';
import type { LookupTable } from '../../api/mappings';
import { Loader2, GitBranch, Plus, Trash2, Table2 } from 'lucide-react';
import { toast } from 'sonner';

function parseRulesJson(json: string): MappingRule[] | null {
  try {
    const parsed = JSON.parse(json) as unknown;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function MappingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [rulesJson, setRulesJson] = useState<string>('[]');
  const [showAddTable, setShowAddTable] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newTableRows, setNewTableRows] = useState<Array<{ key: string; valueJson: string }>>([{ key: '', valueJson: '{}' }]);

  const { data: mapping, isLoading, error } = useQuery({
    queryKey: ['mapping', id],
    queryFn: () => mappingsApi.getOne(id!),
    enabled: !!id,
  });

  const { data: lookupTables = [], isLoading: loadingTables } = useQuery({
    queryKey: ['mapping', id, 'lookup-tables'],
    queryFn: () => mappingsApi.getLookupTables(id!),
    enabled: !!id && !!mapping,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { rules: MappingRule[] }) => mappingsApi.update(id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mapping', id] });
      toast.success('Mapping enregistré.');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement';
      toast.error(msg);
    },
  });

  const addTableMutation = useMutation({
    mutationFn: (payload: { name: string; data: Record<string, Record<string, unknown>> }) =>
      mappingsApi.addLookupTable(id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mapping', id, 'lookup-tables'] });
      setShowAddTable(false);
      setNewTableName('');
      setNewTableRows([{ key: '', valueJson: '{}' }]);
      toast.success('Table de correspondance ajoutée.');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l\'ajout';
      toast.error(msg);
    },
  });

  const deleteTableMutation = useMutation({
    mutationFn: (tableId: string) => mappingsApi.deleteLookupTable(id!, tableId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mapping', id, 'lookup-tables'] });
      toast.success('Table supprimée.');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la suppression';
      toast.error(msg);
    },
  });

  const rulesInitializedRef = useRef(false);
  useEffect(() => {
    if (mapping && Array.isArray(mapping.rules) && !rulesInitializedRef.current) {
      setRulesJson(JSON.stringify(mapping.rules, null, 2));
      rulesInitializedRef.current = true;
    }
  }, [mapping]);
  useEffect(() => {
    rulesInitializedRef.current = false;
  }, [id]);

  const rulesEditing = rulesJson;

  const handleSaveRules = () => {
    const rules = parseRulesJson(rulesEditing);
    if (rules === null) {
      toast.error('Règles invalides (JSON incorrect).');
      return;
    }
    updateMutation.mutate({ rules });
  };

  const handleAddTable = () => {
    const name = newTableName.trim();
    if (!name) {
      toast.error('Nom de la table requis.');
      return;
    }
    const data: Record<string, Record<string, unknown>> = {};
    for (const row of newTableRows) {
      const k = row.key.trim();
      if (!k) continue;
      try {
        const val = JSON.parse(row.valueJson || '{}') as Record<string, unknown>;
        data[k] = val;
      } catch {
        data[k] = { value: row.valueJson };
      }
    }
    if (Object.keys(data).length === 0) {
      toast.error('Ajoutez au moins une entrée (clé non vide).');
      return;
    }
    addTableMutation.mutate({ name, data });
  };

  const addTableRow = () => setNewTableRows((prev) => [...prev, { key: '', valueJson: '{}' }]);
  const removeTableRow = (index: number) =>
    setNewTableRows((prev) => prev.filter((_, i) => i !== index));
  const updateTableRow = (index: number, field: 'key' | 'valueJson', value: string) =>
    setNewTableRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );

  const rulesValid = parseRulesJson(rulesEditing) !== null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <BackButton to="/mappings" className="mb-6">
        Retour aux mappings
      </BackButton>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      )}

      {error && (
        <Card variant="solid" className="p-8 text-center">
          <p className="text-slate-600">Mapping introuvable ou erreur de chargement.</p>
        </Card>
      )}

      {!isLoading && !error && mapping && (
        <>
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-violet-500/20 rounded-xl border border-violet-400/30">
              <GitBranch className="w-8 h-8 text-violet-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-700">{mapping.name}</h2>
              <p className="text-slate-600">
                {Array.isArray(mapping.rules) ? mapping.rules.length : 0} règle(s) de transformation
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-slate-800">Schéma source</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm text-slate-600 bg-slate-50 rounded-xl p-4 overflow-auto max-h-64">
                  {JSON.stringify(mapping.sourceSchema, null, 2)}
                </pre>
              </CardContent>
            </Card>
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-slate-800">Schéma destination</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm text-slate-600 bg-slate-50 rounded-xl p-4 overflow-auto max-h-64">
                  {JSON.stringify(mapping.destinationSchema, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </div>

          <Card variant="glass" className="mt-6">
            <CardHeader>
              <CardTitle className="text-slate-800">Règles</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full text-sm font-mono text-slate-600 bg-slate-50 rounded-xl p-4 overflow-auto min-h-[120px] max-h-96 border border-slate-200 focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400"
                value={rulesEditing}
                onChange={(e) => setRulesJson(e.target.value)}
                spellCheck={false}
              />
              {!rulesValid && rulesEditing.trim() !== '' && (
                <p className="text-sm text-red-500 mt-1">JSON des règles invalide.</p>
              )}
            </CardContent>
          </Card>

          <Card variant="glass" className="mt-6">
            <CardHeader>
              <CardTitle className="text-slate-800 flex items-center gap-2">
                <Table2 className="w-5 h-5" />
                Tables de correspondance (tranco)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingTables ? (
                <p className="text-slate-500 text-sm">Chargement…</p>
              ) : (
                <>
                  {lookupTables.length === 0 && !showAddTable && (
                    <p className="text-slate-500 text-sm">Aucune table. Ajoutez-en une si besoin.</p>
                  )}
                  {lookupTables.map((t: LookupTable) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-3"
                    >
                      <span className="font-medium text-slate-800">{t.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTableMutation.mutate(t.id)}
                        disabled={deleteTableMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-slate-500" />
                      </Button>
                    </div>
                  ))}
                  {showAddTable ? (
                    <div className="rounded-xl border border-primary-200 bg-primary-50/30 p-4 space-y-3">
                      <Input
                        label="Nom de la table"
                        value={newTableName}
                        onChange={(e) => setNewTableName(e.target.value)}
                        placeholder="ex. codes_pays"
                      />
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-700">Entrées (clé → valeur JSON)</p>
                        {newTableRows.map((row, index) => (
                          <div key={index} className="flex gap-2 items-start">
                            <input
                              className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-slate-200 text-sm"
                              placeholder="Clé"
                              value={row.key}
                              onChange={(e) => updateTableRow(index, 'key', e.target.value)}
                            />
                            <input
                              className="flex-[2] min-w-0 px-3 py-2 rounded-lg border border-slate-200 font-mono text-sm"
                              placeholder='{"value": "..."}'
                              value={row.valueJson}
                              onChange={(e) => updateTableRow(index, 'valueJson', e.target.value)}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTableRow(index)}
                              disabled={newTableRows.length <= 1}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <Button variant="secondary" size="sm" onClick={addTableRow}>
                          <Plus className="w-4 h-4 mr-1" />
                          Ajouter une ligne
                        </Button>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleAddTable}
                          loading={addTableMutation.isPending}
                        >
                          Enregistrer la table
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowAddTable(false);
                            setNewTableName('');
                            setNewTableRows([{ key: '', valueJson: '{}' }]);
                          }}
                        >
                          Annuler
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setShowAddTable(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter une table de correspondance
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button
              variant="primary"
              onClick={handleSaveRules}
              disabled={!rulesValid || updateMutation.isPending}
              loading={updateMutation.isPending}
            >
              Enregistrer
            </Button>
            <BackButton to="/mappings" className="inline-flex items-center gap-2">
              Retour aux mappings
            </BackButton>
          </div>
        </>
      )}
    </div>
  );
}
