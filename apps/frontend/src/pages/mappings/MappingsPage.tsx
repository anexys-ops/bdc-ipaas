import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button, Card, CardContent, CardTitle } from '../../components/ui';
import { mappingsApi } from '../../api/mappings';
import { GitBranch, Plus, Loader2, ArrowRight } from 'lucide-react';
import type { Mapping } from '../../types';

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function MappingsPage() {
  const { data: mappings, isLoading, error } = useQuery({
    queryKey: ['mappings'],
    queryFn: mappingsApi.getAll,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-primary-400 text-sm font-medium uppercase tracking-wider mb-1">
              Règles de transformation
            </p>
            <h2 className="text-2xl font-bold text-slate-700">Mappings</h2>
            <p className="text-slate-600 mt-1">
              Définissez comment les données sont transformées entre source et destination.
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/mappings/canvas">
              <Button size="lg">
                <Plus className="w-5 h-5 mr-2" />
                Nouveau mapping (visuel)
              </Button>
            </Link>
            <Link to="/mappings/new">
              <Button size="lg" variant="outline">
                Nouveau mapping (formulaire)
              </Button>
            </Link>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        )}

        {error && (
          <Card variant="solid" className="p-8 text-center">
            <p className="text-slate-600">Impossible de charger les mappings.</p>
            <p className="text-sm text-slate-500 mt-1">
              {error instanceof Error ? error.message : String(error)}
            </p>
          </Card>
        )}

        {!isLoading && !error && mappings && mappings.length === 0 && (
          <Card variant="glass" className="p-12 text-center">
            <GitBranch className="w-14 h-14 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-800">Aucun mapping</h3>
            <p className="text-slate-500 mt-2 max-w-md mx-auto">
              Créez votre premier mapping pour transformer des données entre vos connecteurs.
            </p>
            <Link to="/mappings/canvas" className="inline-block mt-6">
              <Button size="lg">
                <Plus className="w-5 h-5 mr-2" />
                Créer un mapping (visuel)
              </Button>
            </Link>
          </Card>
        )}

        {!isLoading && !error && mappings && mappings.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mappings.map((m: Mapping) => (
              <Link key={m.id} to={`/mappings/${m.id}`}>
                <Card className="h-full glass-card-hover cursor-pointer group">
                  <CardContent>
                    <div className="flex items-start justify-between">
                      <div className="p-3 bg-violet-500/20 rounded-xl border border-violet-400/30">
                        <GitBranch className="w-6 h-6 text-violet-400" />
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                    </div>
                    <CardTitle className="mt-4 text-slate-800">{m.name}</CardTitle>
                    <p className="text-sm text-slate-500 mt-1">
                      {Array.isArray(m.rules) ? m.rules.length : 0} règle(s)
                    </p>
                    <p className="text-xs text-slate-400 mt-2">
                      Modifié le {formatDate(m.updatedAt)}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
    </div>
  );
}
