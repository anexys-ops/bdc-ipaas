import { useAuthStore } from '../../stores/auth.store';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardHeader, CardTitle, CardContent } from '../../components/ui';
import { LogOut, Package, Zap, Users } from 'lucide-react';
import { authApi } from '../../api/auth';
import { toast } from 'sonner';

export function DashboardPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore error
    }
    logout();
    toast.success('Déconnexion réussie');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">ANEXYS iPaaS</h1>
              <p className="text-sm text-gray-500">
                Bienvenue, {user?.firstName} {user?.lastName}
              </p>
            </div>
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Zap className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-gray-500">Flux actifs</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-gray-500">Connecteurs</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{user?.role}</p>
                <p className="text-sm text-gray-500">Votre rôle</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Démarrage rapide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                href="/marketplace"
                className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
              >
                <h3 className="font-medium text-gray-900">Explorer le Marketplace</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Découvrez les connecteurs disponibles
                </p>
              </a>
              <a
                href="/connectors"
                className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
              >
                <h3 className="font-medium text-gray-900">Configurer un connecteur</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Ajoutez vos credentials
                </p>
              </a>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
