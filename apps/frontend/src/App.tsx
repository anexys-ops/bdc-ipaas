import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth.store';
import { PrivateLayout } from './components/layout';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupTrialPage } from './pages/auth/SignupTrialPage';
import { HomePage } from './pages/home/HomePage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { AuditPage } from './pages/audit/AuditPage';
import { MarketplacePage } from './pages/marketplace/MarketplacePage';
import { ConnectorDetailPage } from './pages/marketplace/ConnectorDetailPage';
import { ConnectorsListPage } from './pages/connectors/ConnectorsListPage';
import { ConnectorNewPage } from './pages/connectors/ConnectorNewPage';
import { ConfiguredConnectorDetailPage } from './pages/connectors/ConfiguredConnectorDetailPage';
import { AccountPage } from './pages/account/AccountPage';
import { ApiKeyPage } from './pages/settings/ApiKeyPage';
import { BillingPage } from './pages/billing/BillingPage';
import { InvoicesPage } from './pages/billing/InvoicesPage';
import { QuotaPage } from './pages/billing/QuotaPage';
import { ClientsListPage } from './pages/backoffice/ClientsListPage';
import { ClientDetailPage } from './pages/backoffice/ClientDetailPage';
import { ClientNewPage } from './pages/backoffice/ClientNewPage';
import { BackofficeDashboardPage } from './pages/backoffice/BackofficeDashboardPage';
import { BackofficeInvoicesPage } from './pages/backoffice/BackofficeInvoicesPage';
import { MappingsPage } from './pages/mappings/MappingsPage';
import { MappingDetailPage } from './pages/mappings/MappingDetailPage';
import { MappingNewPage } from './pages/mappings/MappingNewPage';
import { MappingCanvasPage } from './pages/mappings/MappingCanvasPage';
import { FlowsPage } from './pages/flows/FlowsPage';
import { PlanifierPage } from './pages/planifier/PlanifierPage';
import { PlanifierNewPage } from './pages/planifier/PlanifierNewPage';
import { PlanifierEditPage } from './pages/planifier/PlanifierEditPage';
import { EdifactPage } from './pages/edifact/EdifactPage';
import { EdifactSendPage } from './pages/edifact/EdifactSendPage';
import { UsersPage } from './pages/users/UsersPage';
import { GroupsPage } from './pages/groups/GroupsPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function BackOfficeRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.user?.role);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role !== 'SUPER_ADMIN') return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup-trial" element={<SignupTrialPage />} />

      {/* Routes privées avec menu commun (Marketplace inclus pour garder le menu) */}
      <Route
        element={
          <PrivateRoute>
            <PrivateLayout />
          </PrivateRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/marketplace/:type" element={<ConnectorDetailPage />} />
        <Route path="/audit" element={<AuditPage />} />
        <Route path="/flows" element={<FlowsPage />} />
        <Route path="/planifier" element={<PlanifierPage />} />
        <Route path="/planifier/new" element={<PlanifierNewPage />} />
        <Route path="/planifier/:id/edit" element={<PlanifierEditPage />} />
        <Route path="/edifact" element={<EdifactPage />} />
        <Route path="/edifact/send" element={<EdifactSendPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/groups" element={<GroupsPage />} />
        <Route path="/mappings" element={<MappingsPage />} />
        <Route path="/mappings/canvas" element={<MappingCanvasPage />} />
        <Route path="/mappings/new" element={<MappingNewPage />} />
        <Route path="/mappings/:id" element={<MappingDetailPage />} />
        <Route path="/connectors" element={<ConnectorsListPage />} />
        <Route path="/connectors/new" element={<ConnectorNewPage />} />
        <Route path="/connectors/:id" element={<ConfiguredConnectorDetailPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/settings/api-key" element={<ApiKeyPage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/billing/invoices" element={<InvoicesPage />} />
        <Route path="/billing/quota" element={<QuotaPage />} />
        <Route
          path="/backoffice"
          element={
            <BackOfficeRoute>
              <BackofficeDashboardPage />
            </BackOfficeRoute>
          }
        />
        <Route
          path="/backoffice/invoices"
          element={
            <BackOfficeRoute>
              <BackofficeInvoicesPage />
            </BackOfficeRoute>
          }
        />
        <Route
          path="/backoffice/clients"
          element={
            <BackOfficeRoute>
              <ClientsListPage />
            </BackOfficeRoute>
          }
        />
        <Route
          path="/backoffice/clients/new"
          element={
            <BackOfficeRoute>
              <ClientNewPage />
            </BackOfficeRoute>
          }
        />
        <Route
          path="/backoffice/clients/:id"
          element={
            <BackOfficeRoute>
              <ClientDetailPage />
            </BackOfficeRoute>
          }
        />
      </Route>

      {/* Redirects */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
