import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Loader2, Package, Check } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '../../components/ui';
import { marketplaceApi } from '../../api/marketplace';

export function ConnectorDetailPage() {
  const { type } = useParams<{ type: string }>();

  const { data: connector, isLoading, error } = useQuery({
    queryKey: ['marketplace', type],
    queryFn: () => marketplaceApi.getDetail(type!),
    enabled: !!type,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !connector) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Connecteur non trouvé</p>
          <Link to="/marketplace" className="text-primary-600 mt-2 inline-block">
            Retour au marketplace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            to="/marketplace"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Retour au marketplace
          </Link>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center text-3xl">
                🔌
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{connector.name}</h1>
                <p className="text-gray-500">{connector.category}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {connector.docsUrl && (
                <a
                  href={connector.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
                >
                  Documentation <ExternalLink className="w-4 h-4 ml-1" />
                </a>
              )}
              <Link to="/login">
                <Button>Configurer</Button>
              </Link>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <span className="text-sm text-gray-500">Version {connector.version}</span>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              connector.authType === 'oauth2' 
                ? 'bg-purple-100 text-purple-700'
                : connector.authType === 'api_key'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-gray-100 text-gray-700'
            }`}>
              Auth: {connector.authType}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {connector.sourceOperations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  Opérations Source ({connector.sourceOperations.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {connector.sourceOperations.map((op) => (
                    <li key={op.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <Check className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">{op.label}</p>
                        {op.description && (
                          <p className="text-sm text-gray-500 mt-1">{op.description}</p>
                        )}
                        <span className="text-xs text-gray-400 mt-1 inline-block">
                          {op.method}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {connector.destinationOperations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  Opérations Destination ({connector.destinationOperations.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {connector.destinationOperations.map((op) => (
                    <li key={op.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <Check className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">{op.label}</p>
                        {op.description && (
                          <p className="text-sm text-gray-500 mt-1">{op.description}</p>
                        )}
                        <span className="text-xs text-gray-400 mt-1 inline-block">
                          {op.method}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {connector.triggerOperations.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                  Déclencheurs ({connector.triggerOperations.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {connector.triggerOperations.map((op) => (
                    <li key={op.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <Check className="w-5 h-5 text-orange-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">{op.label}</p>
                        {op.description && (
                          <p className="text-sm text-gray-500 mt-1">{op.description}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
