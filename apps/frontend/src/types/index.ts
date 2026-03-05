export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
  tenantSlug: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface MarketplaceConnector {
  id: string;
  name: string;
  version: string;
  icon: string;
  category: string;
  authType: string;
  docsUrl?: string | null;
  sourceOperationsCount: number;
  destinationOperationsCount: number;
}

export interface MarketplaceCategory {
  name: string;
  count: number;
  connectors: MarketplaceConnector[];
}

export interface ConnectorOperation {
  id: string;
  label: string;
  type: string;
  method: string;
  description?: string;
}

export interface MarketplaceConnectorDetail extends MarketplaceConnector {
  authConfig: Record<string, unknown>;
  sourceOperations: ConnectorOperation[];
  destinationOperations: ConnectorOperation[];
  triggerOperations: ConnectorOperation[];
}

export interface ConfiguredConnector {
  id: string;
  type: string;
  name: string;
  isActive: boolean;
  lastTestedAt?: string | null;
  lastTestOk?: boolean | null;
  createdAt: string;
  connectorInfo: {
    name: string;
    icon: string;
    category: string;
    auth_type: string;
  };
}
