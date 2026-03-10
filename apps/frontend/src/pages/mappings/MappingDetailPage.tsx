import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui';
import { BackButton } from '../../components/layout';
import { mappingsApi } from '../../api/mappings';
import { Loader2, GitBranch } from 'lucide-react';

export function MappingDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: mapping, isLoading, error } = useQuery({
    queryKey: ['mapping', id],
    queryFn: () => mappingsApi.getOne(id!),
    enabled: !!id,
  });

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
                <pre className="text-sm text-slate-600 bg-slate-50 rounded-xl p-4 overflow-auto max-h-96">
                  {JSON.stringify(mapping.rules, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </>
        )}
    </div>
  );
}
