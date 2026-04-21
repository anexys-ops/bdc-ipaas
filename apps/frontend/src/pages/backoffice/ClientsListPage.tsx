import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button, Card, CardContent, CardTitle } from '../../components/ui';
import { BackofficePageContainer, BackofficePageHeader } from '../../components/layout';
import { tenantsApi } from '../../api/tenants';
import { Plus, Building2, Loader2, ArrowRight, Users, Package } from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';

function tenantCreatedAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "aujourd'hui";
  if (diffDays === 1) return 'hier';
  if (diffDays < 7) return `il y a ${diffDays} j`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function ClientsListPage() {
  const user = useAuthStore((s) => s.user);

  const { data: tenants, isLoading, error } = useQuery({
    queryKey: ['tenants', 'withStats'],
    queryFn: () => tenantsApi.getAll(true),
    enabled: user?.role === 'SUPER_ADMIN',
  });

  if (user?.role !== 'SUPER_ADMIN') {
    return null;
  }

  if (isLoading) {
    return (
      <BackofficePageContainer>
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      </BackofficePageContainer>
    );
  }

  if (error) {
    return (
      <BackofficePageContainer>
        <Card className="border-2 border-red-200 text-center py-10">
          <CardContent>
            <p className="text-sm text-red-500">Erreur lors du chargement des clients.</p>
          </CardContent>
        </Card>
      </BackofficePageContainer>
    );
  }

  return (
    <BackofficePageContainer>
      <BackofficePageHeader
        title="Clients"
        description="Gestion des clients (tenants)."
      >
        <Link to="/backoffice/clients/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nouveau client
          </Button>
        </Link>
      </BackofficePageHeader>
        {!tenants?.length ? (
          <Card className="border-2 border-slate-200 text-center py-12">
            <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <CardTitle className="text-slate-800">Aucun client</CardTitle>
            <CardContent className="mt-2">
              <p className="text-sm text-slate-500 mb-6">
                Les clients (tenants) apparaîtront ici. Chaque client peut avoir plusieurs
                connecteurs et utilisateurs.
              </p>
              <Link to="/backoffice/clients/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Créer un client
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {tenants.map((t) => (
              <li key={t.id}>
                <Link to={`/backoffice/clients/${t.id}`}>
                  <Card className="border-2 border-slate-200 hover:border-primary-500/50 transition-colors cursor-pointer">
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{t.name}</p>
                          <p className="text-sm text-slate-500">{t.slug}</p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-400">
                            <span title="Date de création">
                              Créé le {tenantCreatedAt(t.createdAt)}
                            </span>
                            {t.stats?.lastLoginAt != null && (
                              <span title="Dernière connexion">
                                Dernière co. {formatRelativeDate(t.stats.lastLoginAt)}
                              </span>
                            )}
                            {t.stats != null && (
                              <>
                                <span className="flex items-center gap-1">
                                  <Users className="w-3.5 h-3.5" />
                                  {t.stats.usersCount} utilisateur(s)
                                </span>
                                <span className="flex items-center gap-1">
                                  <Package className="w-3.5 h-3.5" />
                                  {t.stats.connectorsCount} connecteur(s)
                                </span>
                                <span>{t.stats.flowsCount} flux</span>
                              </>
                            )}
                            <span
                              className={
                                t.isActive ? 'text-emerald-600' : 'text-amber-600'
                              }
                            >
                              {t.isActive ? 'Actif' : 'Inactif'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-400" />
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
    </BackofficePageContainer>
  );
}
