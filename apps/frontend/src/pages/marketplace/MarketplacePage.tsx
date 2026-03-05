import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, ArrowRight, Package, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent, Input } from '../../components/ui';
import { marketplaceApi } from '../../api/marketplace';
import type { MarketplaceConnector } from '../../types';

const categoryIcons: Record<string, string> = {
  'CRM / Facturation': '💼',
  'ERP / Comptabilité': '📊',
  'ERP / CRM': '🏢',
  'E-commerce': '🛒',
  'Fichiers': '📁',
};

function ConnectorCard({ connector }: { connector: MarketplaceConnector }) {
  return (
    <Link to={`/marketplace/${connector.id}`}>
      <Card className="h-full hover:shadow-md hover:border-primary-200 transition-all cursor-pointer group">
        <CardContent>
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
              {categoryIcons[connector.category] || '🔌'}
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
          </div>

          <h3 className="mt-4 font-semibold text-gray-900">{connector.name}</h3>
          <p className="text-sm text-gray-500 mt-1">{connector.category}</p>

          <div className="mt-4 flex items-center gap-4 text-sm">
            <span className="text-green-600">
              {connector.sourceOperationsCount} sources
            </span>
            <span className="text-blue-600">
              {connector.destinationOperationsCount} destinations
            </span>
          </div>

          <div className="mt-3">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              connector.authType === 'oauth2' 
                ? 'bg-purple-100 text-purple-700'
                : connector.authType === 'api_key'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-gray-100 text-gray-700'
            }`}>
              {connector.authType}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function MarketplacePage() {
  const [search, setSearch] = useState('');

  const { data: categories, isLoading, error } = useQuery({
    queryKey: ['marketplace', 'categories'],
    queryFn: marketplaceApi.getByCategories,
  });

  const filteredCategories = categories?.map((cat) => ({
    ...cat,
    connectors: cat.connectors.filter(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.category.toLowerCase().includes(search.toLowerCase()),
    ),
  })).filter((cat) => cat.connectors.length > 0);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Impossible de charger le marketplace</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
              <p className="text-gray-500 mt-1">
                Découvrez les connecteurs disponibles pour vos intégrations
              </p>
            </div>
            <Link
              to="/login"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Se connecter →
            </Link>
          </div>

          <div className="mt-6 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Rechercher un connecteur..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredCategories?.map((category) => (
          <section key={category.name} className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl">{categoryIcons[category.name] || '📦'}</span>
              <h2 className="text-xl font-semibold text-gray-900">{category.name}</h2>
              <span className="text-sm text-gray-500">({category.count})</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {category.connectors.map((connector) => (
                <ConnectorCard key={connector.id} connector={connector} />
              ))}
            </div>
          </section>
        ))}

        {filteredCategories?.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Aucun connecteur ne correspond à votre recherche</p>
          </div>
        )}
      </main>
    </div>
  );
}
