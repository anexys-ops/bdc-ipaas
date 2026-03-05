import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth.store';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { MarketplacePage } from './pages/marketplace/MarketplacePage';
import { ConnectorDetailPage } from './pages/marketplace/ConnectorDetailPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/marketplace" element={<MarketplacePage />} />
      <Route path="/marketplace/:type" element={<ConnectorDetailPage />} />
      
      {/* Private routes */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <DashboardPage />
          </PrivateRoute>
        }
      />
      
      {/* Redirects */}
      <Route path="/" element={<Navigate to="/marketplace" replace />} />
      <Route path="*" element={<Navigate to="/marketplace" replace />} />
    </Routes>
  );
}

export default App;
