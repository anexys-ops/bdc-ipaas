import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui';
import { BackofficePageContainer, BackofficePageHeader } from '../../components/layout';
import { tenantsApi } from '../../api/tenants';
import { Building2, FileText, Users, Loader2, ArrowRight, Store, FolderSync } from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';

export function BackofficeDashboardPage() {
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (error) {
    return (
      <BackofficePageContainer>
        <Card className="border-2 border-red-200">
          <CardContent className="py-6">
            <p className="text-sm text-red-600">Erreur lors du chargement du dashboard.</p>
          </CardContent>
        </Card>
      </BackofficePageContainer>
    );
  }

  const count = tenants?.length ?? 0;

  return (
    <BackofficePageContainer>
      <BackofficePageHeader
        title="Dashboard gestion"
        description="Vue d’ensemble des clients et de la facturation."
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Link to="/backoffice/clients">
          <Card className="h-full border-2 border-slate-200 hover:border-primary-200 transition-colors">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 bg-primary-100 rounded-xl border border-primary-200">
                <Building2 className="w-6 h-6 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-2xl font-bold text-slate-800">{count}</p>
                <p className="text-sm text-slate-600">Clients</p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/backoffice/invoices">
          <Card className="h-full border-2 border-slate-200 hover:border-primary-200 transition-colors">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 bg-emerald-100 rounded-xl border border-emerald-200">
                <FileText className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-2xl font-bold text-slate-800">Factures</p>
                <p className="text-sm text-slate-600">Voir les factures clients</p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/backoffice/marketplace">
          <Card className="h-full border-2 border-slate-200 hover:border-primary-200 transition-colors">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 bg-amber-100 rounded-xl border border-amber-200">
                <Store className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-2xl font-bold text-slate-800">Gestion marketplace</p>
                <p className="text-sm text-slate-600">Étoiles, tarifs, texte et API par connecteur</p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/backoffice/file-flows">
          <Card className="h-full border-2 border-slate-200 hover:border-primary-200 transition-colors">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 bg-violet-100 rounded-xl border border-violet-200">
                <FolderSync className="w-6 h-6 text-violet-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-2xl font-bold text-slate-800">Flux fichiers</p>
                <p className="text-sm text-slate-600">Pilotage réception, mapping et dépôt</p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400" />
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card className="border-2 border-slate-200 mb-8">
        <CardHeader>
          <CardTitle className="text-slate-800">Tuile Benthos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 mb-4">
            Accès rapide à tous les écrans back-office du pipeline fichier (réception, mapping, orchestration, supervision).
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Link to="/backoffice/file-flows" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-primary-300 hover:text-primary-700">
              Flux fichiers (Benthos)
            </Link>
            <Link to="/backoffice/planifier" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-primary-300 hover:text-primary-700">
              Planifier les flows
            </Link>
            <Link to="/backoffice/planifier/new" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-primary-300 hover:text-primary-700">
              Créer un flow fichier
            </Link>
            <Link to="/backoffice/connectors" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-primary-300 hover:text-primary-700">
              Connecteurs
            </Link>
            <Link to="/backoffice/mappings" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-primary-300 hover:text-primary-700">
              Mappings
            </Link>
            <Link to="/monitoring" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-primary-300 hover:text-primary-700">
              Monitoring
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <Users className="w-5 h-5" />
            Derniers clients
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!tenants?.length ? (
            <p className="text-sm text-slate-500">Aucun client. <Link to="/backoffice/clients/new" className="text-primary-600 font-medium">Créer un client</Link></p>
          ) : (
            <ul className="space-y-2">
              {tenants.slice(0, 5).map((t) => (
                <li key={t.id}>
                  <Link
                    to={`/backoffice/clients/${t.id}`}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200"
                  >
                    <span className="font-medium text-slate-800">{t.name}</span>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </BackofficePageContainer>
  );
}
