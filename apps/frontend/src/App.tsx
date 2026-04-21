import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from './stores/auth.store';
import { PrivateLayout, PublicLayout, BackofficeLayout } from './components/layout';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupTrialPage } from './pages/auth/SignupTrialPage';
import { ReserverDemoPage } from './pages/demo/ReserverDemoPage';
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
import { MarketplaceManagementPage } from './pages/backoffice/MarketplaceManagementPage';
import { BackofficeFileFlowsPage } from './pages/backoffice/BackofficeFileFlowsPage';
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
import { MonitoringPage } from './pages/monitoring/MonitoringPage';
import { PipelineHubPage } from './pages/hub/PipelineHubPage';
import { TarifsPage } from './pages/tarifs/TarifsPage';
import { AvisPage } from './pages/avis/AvisPage';
import { SubscribePage } from './pages/billing/SubscribePage';

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

/** Marketplace : si authentifié → PrivateLayout (rester connecté), sinon → PublicLayout */
function MarketplaceLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? (
    <PrivateLayout>
      <Outlet />
    </PrivateLayout>
  ) : (
    <PublicLayout>
      <Outlet />
    </PublicLayout>
  );
}

function App() {
  return (
    <Routes>
      {/* Pages marketing : même en-tête que marketplace (visiteur) */}
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="tarifs" element={<TarifsPage />} />
        <Route path="avis" element={<AvisPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="signup-trial" element={<SignupTrialPage />} />
        <Route path="reserver-demo" element={<ReserverDemoPage />} />
      </Route>

      {/* Marketplace : si authentifié → PrivateLayout (rester connecté), sinon → PublicLayout */}
      <Route path="/marketplace" element={<MarketplaceLayout />}>
        <Route index element={<MarketplacePage />} />
        <Route path=":type" element={<ConnectorDetailPage />} />
      </Route>

      {/* Routes privées avec menu commun */}
      <Route
        element={
          <PrivateRoute>
            <PrivateLayout />
          </PrivateRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
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
        <Route path="/billing/subscribe" element={<SubscribePage />} />
        <Route path="/billing/invoices" element={<InvoicesPage />} />
        <Route path="/billing/quota" element={<QuotaPage />} />
        <Route path="/monitoring" element={<MonitoringPage />} />
        <Route path="/hub/pipeline" element={<PipelineHubPage />} />
        <Route
          path="/backoffice"
          element={
            <BackOfficeRoute>
              <BackofficeLayout />
            </BackOfficeRoute>
          }
        >
          <Route index element={<BackofficeDashboardPage />} />
          <Route path="invoices" element={<BackofficeInvoicesPage />} />
          <Route path="marketplace" element={<MarketplaceManagementPage />} />
          <Route path="file-flows" element={<BackofficeFileFlowsPage />} />
          <Route path="clients" element={<ClientsListPage />} />
          <Route path="clients/new" element={<ClientNewPage />} />
          <Route path="clients/:id" element={<ClientDetailPage />} />
          <Route path="connectors" element={<ConnectorsListPage />} />
          <Route path="connectors/new" element={<ConnectorNewPage />} />
          <Route path="connectors/:id" element={<ConfiguredConnectorDetailPage />} />
          <Route path="mappings" element={<MappingsPage />} />
          <Route path="mappings/canvas" element={<MappingCanvasPage />} />
          <Route path="mappings/new" element={<MappingNewPage />} />
          <Route path="mappings/:id" element={<MappingDetailPage />} />
          <Route path="planifier" element={<PlanifierPage />} />
          <Route path="planifier/new" element={<PlanifierNewPage />} />
          <Route path="planifier/:id/edit" element={<PlanifierEditPage />} />
          <Route path="edifact" element={<EdifactPage />} />
          <Route path="edifact/send" element={<EdifactSendPage />} />
        </Route>
      </Route>

      {/* Redirects */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
