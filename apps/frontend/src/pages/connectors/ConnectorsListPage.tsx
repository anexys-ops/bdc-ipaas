import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { Button, Card, CardContent, CardTitle } from '../../components/ui';
import { connectorsApi } from '../../api/connectors';
import { getConnectorLogoUrl } from '../../lib/connector-logos';
import { SoftwareLogoImg } from '../../components/marketplace/SoftwareLogoImg';
import { Plus, Package, Loader2, ArrowRight, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function ConnectorsListPage() {
  const location = useLocation();
  const isBackoffice = location.pathname.startsWith('/backoffice/');
  const basePath = isBackoffice ? '/backoffice/connectors' : '/connectors';
  const queryClient = useQueryClient();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: connectors, isLoading, error } = useQuery({
    queryKey: ['connectors'],
    queryFn: () => connectorsApi.getAll(),
  });

  const testMutation = useMutation({
    mutationFn: (connectorId: string) => connectorsApi.test(connectorId),
    onSuccess: (result, connectorId) => {
      if (result.success) toast.success('Connexion OK');
      else toast.error(result.message);
      queryClient.invalidateQueries({ queryKey: ['connectors'] });
      queryClient.invalidateQueries({ queryKey: ['connectors', connectorId] });
    },
    onError: (err: Error) => toast.error(err.message ?? 'Échec du test'),
  });

  const deleteMutation = useMutation({
    mutationFn: (connectorId: string) => connectorsApi.delete(connectorId),
    onSuccess: () => {
      toast.success('Connecteur supprimé');
      queryClient.invalidateQueries({ queryKey: ['connectors'] });
      setDeleteConfirmId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Erreur à la suppression');
      setDeleteConfirmId(null);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen page-bg-mesh flex items-center justify-center">
        <div className="glass-card p-10 flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          <p className="text-sm text-slate-400">Chargement des connecteurs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen page-bg-mesh flex items-center justify-center p-4">
        <Card className="max-w-md text-center py-10">
          <p className="text-sm text-red-500">Erreur lors du chargement des connecteurs.</p>
          <p className="text-xs text-slate-500 mt-2 font-mono break-all">
            {error instanceof Error ? error.message : String(error)}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-xl font-bold text-slate-700">Connecteurs configurés</h1>
        <Link to={`${basePath}/new`}>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un connecteur
          </Button>
        </Link>
      </div>
        {!connectors?.length ? (
          <Card className="text-center py-12">
            <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <CardTitle className="text-slate-800">Aucun connecteur</CardTitle>
            <CardContent className="mt-2">
              <p className="text-sm text-slate-500 mb-6">
                Configurez un connecteur (Sellsy, EBP, etc.) pour lancer des flux.
              </p>
              <Link to={`${basePath}/new`}>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Configurer un connecteur
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {connectors.map((c) => (
              <li key={c.id}>
                <Card className="hover:border-primary-500/50 transition-colors">
                  <CardContent className="flex items-center justify-between gap-4 py-4">
                    <Link
                      to={`${basePath}/${c.id}`}
                      className="flex items-center gap-4 min-w-0 flex-1"
                    >
                      <SoftwareLogoImg
                        src={getConnectorLogoUrl(c.type, c.connectorInfo?.icon)}
                        alt=""
                        size="md"
                        className="bg-primary-50/50 border-primary-200/50"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800">{c.name}</p>
                        <p className="text-sm text-slate-500">
                          {c.connectorInfo.name} · {c.connectorInfo.category}
                        </p>
                        {c.lastTestedAt != null && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            Dernier test :{' '}
                            {c.lastTestOk ? (
                              <span className="text-emerald-600">OK</span>
                            ) : (
                              <span className="text-amber-600">Échec</span>
                            )}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-400 shrink-0" />
                    </Link>
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.preventDefault()}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          testMutation.mutate(c.id);
                        }}
                        disabled={testMutation.isPending}
                        title="Tester la connexion"
                      >
                        {testMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </Button>
                      <Link to={`${basePath}/${c.id}`} onClick={(e) => e.stopPropagation()}>
                        <Button variant="outline" size="sm" title="Modifier">
                          Modifier
                        </Button>
                      </Link>
                      {deleteConfirmId === c.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteMutation.mutate(c.id)}
                            disabled={deleteMutation.isPending}
                            className="border-red-400 text-red-600"
                          >
                            {deleteMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              'Confirmer'
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirmId(null)}
                            disabled={deleteMutation.isPending}
                          >
                            Annuler
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteConfirmId(c.id)}
                          title="Supprimer"
                          className="border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}
