import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from '../../components/ui';
import {
  marketplaceAdminApi,
  type MarketplaceConnectorAdmin,
  type MarketplaceItemResponse,
  type CreateMarketplaceItemDto,
  type UpdateMarketplaceItemDto,
} from '../../api/marketplace-admin';
import {
  Loader2,
  Star,
  FileJson,
  Pencil,
  Trash2,
  X,
  Save,
  Eye,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';
import { BackofficePageContainer, BackofficePageHeader } from '../../components/layout';
import { toast } from 'sonner';

function OpenApiModal({
  connectorId,
  connectorName,
  onClose,
}: {
  connectorId: string;
  connectorName: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [dirty, setDirty] = useState(false);
  const [text, setText] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['marketplace-admin', 'openapi', connectorId],
    queryFn: () => marketplaceAdminApi.getOpenApi(connectorId),
    enabled: !!connectorId,
  });

  useEffect(() => {
    setDirty(false);
    setText('');
  }, [connectorId]);

  useEffect(() => {
    if (data !== undefined && !dirty) {
      setText(JSON.stringify(data, null, 2));
    }
  }, [data, dirty]);

  const saveMutation = useMutation({
    mutationFn: (content: Record<string, unknown>) =>
      marketplaceAdminApi.putOpenApi(connectorId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-admin', 'openapi', connectorId] });
      queryClient.invalidateQueries({ queryKey: ['marketplace'] });
      toast.success('OpenAPI enregistré');
      setDirty(false);
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur lors de l’enregistrement'),
  });

  const handleSave = () => {
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      const meta = parsed?.connector_meta as { id?: string } | undefined;
      if (!meta || meta.id !== connectorId) {
        toast.error('Le champ connector_meta.id doit correspondre au connecteur');
        return;
      }
      saveMutation.mutate(parsed);
    } catch {
      toast.error('JSON invalide');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <FileJson className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">
              openapi.json — {connectorName}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {dirty && (
              <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Enregistrer
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
              Fermer
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden p-4">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          )}
          {error && (
            <p className="text-sm text-red-600 py-4">
              Impossible de charger le fichier OpenAPI.
            </p>
          )}
          {!isLoading && !error && (
            <textarea
              className="w-full h-full min-h-[400px] font-mono text-sm rounded-xl border border-slate-300 px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setDirty(true);
              }}
              spellCheck={false}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function MarketplaceManagementPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UpdateMarketplaceItemDto & { connectorId?: string }>({});
  const [openApiConnector, setOpenApiConnector] = useState<{ id: string; name: string } | null>(null);
  const [search, setSearch] = useState('');

  const { data: connectors, isLoading: loadingConnectors } = useQuery({
    queryKey: ['marketplace-admin', 'connectors'],
    queryFn: () => marketplaceAdminApi.getConnectors(),
    enabled: user?.role === 'SUPER_ADMIN',
  });

  const { data: items } = useQuery({
    queryKey: ['marketplace-admin', 'items'],
    queryFn: () => marketplaceAdminApi.getAll(),
    enabled: user?.role === 'SUPER_ADMIN',
  });

  const itemsByConnector = new Map<string, MarketplaceItemResponse>(
    (items ?? []).map((i) => [i.connectorId, i]),
  );

  const createMutation = useMutation({
    mutationFn: (dto: CreateMarketplaceItemDto) => marketplaceAdminApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-admin'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace'] });
      setEditingId(null);
      setForm({});
      toast.success('Élément créé');
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur lors de la création'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateMarketplaceItemDto }) =>
      marketplaceAdminApi.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-admin'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace'] });
      setEditingId(null);
      setForm({});
      toast.success('Mis à jour');
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: (connectorId: string) => marketplaceAdminApi.delete(connectorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-admin'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace'] });
      toast.success('Élément supprimé');
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur suppression'),
  });

  const toggleEnabled = (connector: MarketplaceConnectorAdmin) => {
    const item = itemsByConnector.get(connector.id);
    const nextEnabled = !(connector.enabled ?? true);
    if (item) {
      updateMutation.mutate({ id: connector.id, dto: { enabled: nextEnabled } });
    } else {
      createMutation.mutate({
        connectorId: connector.id,
        enabled: nextEnabled,
        stars: 5,
        priceLabel: '99€ HT',
      });
    }
  };

  const startEdit = (connector: MarketplaceConnectorAdmin, item?: MarketplaceItemResponse) => {
    setEditingId(connector.id);
    setForm({
      stars: item?.stars ?? 5,
      priceLabel: item?.priceLabel ?? '99€ HT',
      description: item?.description ?? undefined,
      apiJsonPath: item?.apiJsonPath ?? undefined,
    });
  };

  const saveEdit = () => {
    if (!editingId) return;
    const item = itemsByConnector.get(editingId);
    if (item) {
      updateMutation.mutate({ id: editingId, dto: form });
    } else {
      createMutation.mutate({
        connectorId: editingId,
        stars: form.stars ?? 5,
        priceLabel: form.priceLabel ?? '99€ HT',
        description: form.description,
        apiJsonPath: form.apiJsonPath,
        enabled: true,
      });
    }
  };

  if (user?.role !== 'SUPER_ADMIN') {
    return null;
  }

  const filteredConnectors =
    connectors?.filter(
      (c) =>
        !search.trim() ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.id.toLowerCase().includes(search.toLowerCase()) ||
        c.category.toLowerCase().includes(search.toLowerCase()),
    ) ?? [];

  const byCategory = useMemo(() => {
    const map = new Map<string, typeof filteredConnectors>();
    for (const c of filteredConnectors) {
      const list = map.get(c.category) ?? [];
      list.push(c);
      map.set(c.category, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredConnectors]);

  type AdminTab = 'list' | 'categories';
  const [adminTab, setAdminTab] = useState<AdminTab>('list');

  return (
    <BackofficePageContainer>
      <BackofficePageHeader
        title="Gestion des modules marketplace"
        description="Activez ou désactivez les connecteurs visibles dans la marketplace, configurez les métadonnées et éditez les fichiers OpenAPI."
      />

      <div className="flex border-b border-slate-200 mb-6">
        <button
          type="button"
          onClick={() => setAdminTab('list')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            adminTab === 'list'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Liste des connecteurs
        </button>
        <button
          type="button"
          onClick={() => setAdminTab('categories')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            adminTab === 'categories'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Par catégorie
        </button>
      </div>

      <Card className="border-2 border-slate-200 mb-6">
        <CardHeader>
          <CardTitle className="text-slate-800">
            {adminTab === 'list' ? 'Connecteurs' : 'Connecteurs par catégorie'}
          </CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            Les connecteurs désactivés n’apparaissent pas dans la marketplace publique.
          </p>
          <div className="mt-4">
            <input
              type="search"
              placeholder="Rechercher (nom, id, catégorie…)"
              className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loadingConnectors ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : adminTab === 'categories' ? (
            <div className="space-y-6">
              {byCategory.map(([category, list]) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-primary-100 text-primary-800">{category}</span>
                    <span className="text-slate-500 font-normal">({list.length})</span>
                  </h3>
                  <ul className="space-y-3">
                    {list.map((connector) => {
                      const item = itemsByConnector.get(connector.id);
                      const isEditing = editingId === connector.id;
                      const enabled = connector.enabled ?? true;
                      return (
                        <li
                          key={connector.id}
                          className={`rounded-xl border-2 p-4 transition-colors ${
                            isEditing ? 'border-primary-300 bg-primary-50/50' : 'border-slate-200 bg-slate-50/50'
                          }`}
                        >
                          {isEditing ? (
                            <div className="space-y-4">
                              <p className="font-semibold text-slate-800">
                                Config — {connector.name} ({connector.id})
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm text-slate-600 mb-1">Étoiles</label>
                                  <Input
                                    type="number"
                                    min={1}
                                    max={5}
                                    value={form.stars ?? 5}
                                    onChange={(e) =>
                                      setForm((f) => ({ ...f, stars: parseInt(e.target.value, 10) || 5 }))
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm text-slate-600 mb-1">Tarif</label>
                                  <Input
                                    value={form.priceLabel ?? ''}
                                    onChange={(e) => setForm((f) => ({ ...f, priceLabel: e.target.value }))}
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm text-slate-600 mb-1">Description</label>
                                <textarea
                                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[60px] text-slate-800"
                                  value={form.description ?? ''}
                                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-slate-600 mb-1">Fichier API JSON (chemin)</label>
                                <Input
                                  value={form.apiJsonPath ?? ''}
                                  onChange={(e) => setForm((f) => ({ ...f, apiJsonPath: e.target.value }))}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button onClick={saveEdit} disabled={updateMutation.isPending || createMutation.isPending}>
                                  {updateMutation.isPending || createMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : null}
                                  Enregistrer
                                </Button>
                                <Button variant="outline" onClick={() => { setEditingId(null); setForm({}); }}>
                                  Annuler
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center justify-between gap-4">
                              <div className="flex items-center gap-4 min-w-0">
                                <label className="flex items-center gap-2 cursor-pointer shrink-0">
                                  <input
                                    type="checkbox"
                                    checked={enabled}
                                    onChange={() => toggleEnabled(connector)}
                                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                  />
                                  <span className="font-medium text-slate-800">{connector.name}</span>
                                </label>
                                <span className="text-sm text-slate-500 truncate">({connector.id})</span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                                  {connector.category}
                                </span>
                                {item && (
                                  <span className="inline-flex items-center gap-0.5 text-amber-500">
                                    {Array.from({ length: 5 }, (_, i) => (
                                      <Star
                                        key={i}
                                        className={`w-4 h-4 ${i < (item.stars ?? 5) ? 'fill-amber-500' : 'fill-slate-200'}`}
                                      />
                                    ))}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Button variant="outline" size="sm" onClick={() => startEdit(connector, item)} title="Configurer">
                                  <Pencil className="w-4 h-4" /> Config
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setOpenApiConnector({ id: connector.id, name: connector.name })}
                                  title="Voir / éditer openapi.json"
                                >
                                  <Eye className="w-4 h-4" /> OpenAPI
                                </Button>
                                {item && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 hover:bg-red-50"
                                    onClick={() => {
                                      if (window.confirm(`Supprimer la config marketplace pour ${connector.id} ?`)) {
                                        deleteMutation.mutate(connector.id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <ul className="space-y-3">
              {filteredConnectors.map((connector) => {
                const item = itemsByConnector.get(connector.id);
                const isEditing = editingId === connector.id;
                const enabled = connector.enabled ?? true;

                return (
                  <li
                    key={connector.id}
                    className={`rounded-xl border-2 p-4 transition-colors ${
                      isEditing ? 'border-primary-300 bg-primary-50/50' : 'border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    {isEditing ? (
                      <div className="space-y-4">
                        <p className="font-semibold text-slate-800">
                          Config — {connector.name} ({connector.id})
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-slate-600 mb-1">Étoiles</label>
                            <Input
                              type="number"
                              min={1}
                              max={5}
                              value={form.stars ?? 5}
                              onChange={(e) =>
                                setForm((f) => ({ ...f, stars: parseInt(e.target.value, 10) || 5 }))
                              }
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-slate-600 mb-1">Tarif</label>
                            <Input
                              value={form.priceLabel ?? ''}
                              onChange={(e) => setForm((f) => ({ ...f, priceLabel: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm text-slate-600 mb-1">Description</label>
                          <textarea
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[60px] text-slate-800"
                            value={form.description ?? ''}
                            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-600 mb-1">Fichier API JSON (chemin)</label>
                          <Input
                            value={form.apiJsonPath ?? ''}
                            onChange={(e) => setForm((f) => ({ ...f, apiJsonPath: e.target.value }))}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={saveEdit} disabled={updateMutation.isPending || createMutation.isPending}>
                            {updateMutation.isPending || createMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : null}
                            Enregistrer
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditingId(null);
                              setForm({});
                            }}
                          >
                            Annuler
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <label className="flex items-center gap-2 cursor-pointer shrink-0">
                            <input
                              type="checkbox"
                              checked={enabled}
                              onChange={() => toggleEnabled(connector)}
                              className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="font-medium text-slate-800">{connector.name}</span>
                          </label>
                          <span className="text-sm text-slate-500 truncate">({connector.id})</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                            {connector.category}
                          </span>
                          {item && (
                            <span className="inline-flex items-center gap-0.5 text-amber-500">
                              {Array.from({ length: 5 }, (_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${i < (item.stars ?? 5) ? 'fill-amber-500' : 'fill-slate-200'}`}
                                />
                              ))}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEdit(connector, item)}
                            title="Configurer (étoiles, tarif, description)"
                          >
                            <Pencil className="w-4 h-4" />
                            Config
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setOpenApiConnector({ id: connector.id, name: connector.name })}
                            title="Voir / éditer openapi.json"
                          >
                            <Eye className="w-4 h-4" />
                            OpenAPI
                          </Button>
                          {item && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => {
                                if (window.confirm(`Supprimer la config marketplace pour ${connector.id} ?`)) {
                                  deleteMutation.mutate(connector.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-slate-500 mt-6">
        <Link to="/marketplace" className="text-primary-600 font-medium hover:underline">
          Voir le catalogue marketplace →
        </Link>
      </p>

      {openApiConnector && (
        <OpenApiModal
          connectorId={openApiConnector.id}
          connectorName={openApiConnector.name}
          onClose={() => setOpenApiConnector(null)}
        />
      )}
    </BackofficePageContainer>
  );
}
