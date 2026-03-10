import { useAuthStore } from '../../stores/auth.store';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui';
import { Package, Users, ShieldCheck, Building2, GitBranch } from 'lucide-react';
import { Link } from 'react-router-dom';
import { connectorsApi } from '../../api/connectors';
import { flowsApi } from '../../api/flows';

export function DashboardPage() {
  const { user } = useAuthStore();

  const { data: connectors } = useQuery({
    queryKey: ['connectors'],
    queryFn: () => connectorsApi.getAll(),
  });
  const { data: flows } = useQuery({
    queryKey: ['flows'],
    queryFn: () => flowsApi.getAll(),
  });

  const flowsCount = flows?.length ?? 0;
  const connectorsCount = connectors?.length ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link to="/flows">
            <Card className="hover:border-primary-500/40 transition-colors cursor-pointer h-full">
              <CardContent className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/20 rounded-xl border border-emerald-400/30">
                  <GitBranch className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{flowsCount}</p>
                  <p className="text-sm text-slate-500">Flux</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/connectors">
            <Card className="hover:border-primary-500/40 transition-colors cursor-pointer h-full">
              <CardContent className="flex items-center gap-4">
                <div className="p-3 bg-primary-500/20 rounded-xl border border-primary-400/30">
                  <Package className="w-6 h-6 text-primary-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{connectorsCount}</p>
                  <p className="text-sm text-slate-500">Connecteurs</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card>
            <CardContent className="flex items-center gap-4">
              <div className="p-3 bg-violet-500/20 rounded-xl border border-violet-400/30">
                <Users className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{user?.role}</p>
                <p className="text-sm text-slate-500">Votre rôle</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-slate-800">Démarrage rapide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                to="/flows"
                className="p-5 rounded-xl border border-white/40 bg-white/30 hover:bg-white/50 backdrop-blur-sm transition-all duration-300 group"
              >
                <h3 className="font-medium text-slate-800 group-hover:text-primary-600 transition-colors flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-emerald-600" />
                  Voir les flux et échanges
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Nombre de flux, aller (source → destinations) et retour (exécutions)
                </p>
              </Link>
              <a
                href="/marketplace"
                className="p-5 rounded-xl border border-white/40 bg-white/30 hover:bg-white/50 backdrop-blur-sm transition-all duration-300 group"
              >
                <h3 className="font-medium text-slate-800 group-hover:text-primary-600 transition-colors">
                  Explorer le Marketplace
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Découvrez les connecteurs disponibles
                </p>
              </a>
              <a
                href="/connectors"
                className="p-5 rounded-xl border border-white/40 bg-white/30 hover:bg-white/50 backdrop-blur-sm transition-all duration-300 group"
              >
                <h3 className="font-medium text-slate-800 group-hover:text-primary-600 transition-colors">
                  Configurer un connecteur
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Ajoutez vos credentials
                </p>
              </a>
              <a
                href="/mappings"
                className="p-5 rounded-xl border border-white/40 bg-white/30 hover:bg-white/50 backdrop-blur-sm transition-all duration-300 group"
              >
                <h3 className="font-medium text-slate-800 group-hover:text-primary-600 transition-colors">
                  Mappings
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Règles de transformation des données
                </p>
              </a>
              {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                <Link
                  to="/audit"
                  className="p-5 rounded-xl border border-amber-400/40 bg-amber-500/10 hover:bg-amber-500/20 backdrop-blur-sm transition-all duration-300 group"
                >
                  <h3 className="font-medium text-slate-800 group-hover:text-primary-600 transition-colors flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    Logs d&apos;audit
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Historique des actions (admins)
                  </p>
                </Link>
              )}
              {user?.role === 'SUPER_ADMIN' && (
                <Link
                  to="/backoffice/clients"
                  className="p-5 rounded-xl border border-slate-400/40 bg-slate-500/10 hover:bg-slate-500/20 backdrop-blur-sm transition-all duration-300 group"
                >
                  <h3 className="font-medium text-slate-800 group-hover:text-primary-600 transition-colors flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-600" />
                    Back office
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Gérer les clients et voir leurs connecteurs
                  </p>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
