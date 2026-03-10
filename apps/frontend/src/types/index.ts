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
  /** Endpoint (chemin API), ex: /thirdparties */
  path?: string;
  description?: string;
  /** Schéma complet : { required?: string[], properties?: Record<...> } */
  outputSchema?: Record<string, unknown>;
  inputSchema?: Record<string, unknown>;
  configSchema?: Record<string, unknown>;
  fileFormat?: string;
}

export interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'password';
  required: boolean;
  placeholder?: string;
  description?: string;
}

export interface AgentDownloads {
  windows?: string;
  mac?: string;
}

export interface MarketplaceConnectorDetail extends MarketplaceConnector {
  authConfig: Record<string, unknown>;
  configFields: ConfigField[];
  configInstructions?: string;
  /** Pour connecteur agent : packages à télécharger (Windows / Mac). */
  agentDownloads?: AgentDownloads;
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

export interface FlowDestination {
  id: string;
  connectorId: string;
  connectorName: string;
  connectorType: string;
  mappingId?: string | null;
  orderIndex: number;
  isActive: boolean;
}

export interface Flow {
  id: string;
  name: string;
  description?: string | null;
  sourceConnectorId: string;
  sourceConnectorName: string;
  sourceConnectorType: string;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  environment: string;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  destinations: FlowDestination[];
}

export type ExecutionStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCESS'
  | 'PARTIAL'
  | 'FAILED'
  | 'DRY_RUN_OK';

export interface FlowExecution {
  executionId: string;
  status: ExecutionStatus;
  recordsIn: number;
  recordsOut: number;
  recordsFailed: number;
  errorMessage?: string;
  startedAt?: string;
  finishedAt?: string | null;
}

/** Schéma OpenAPI-like (opération connecteur) */
export interface OperationSchemaJson {
  type?: string;
  required?: string[];
  properties?: Record<string, { type?: string; description?: string; default?: unknown }>;
}

/** Champ extrait d'un schéma (pour affichage obligatoire / facultatif) */
export interface SchemaFieldDisplay {
  name: string;
  type: string;
  required: boolean;
}

export type WriteModeType = 'CREATE' | 'UPDATE' | 'UPSERT' | 'SKIP';

export interface MappingRule {
  destinationField: string;
  type: 'from' | 'formula' | 'value' | 'lookup' | 'concatenate' | 'conditional';
  sourceField?: string;
  formula?: string;
  value?: unknown;
  parts?: (string | unknown)[];
  separator?: string;
  condition?: string;
  valueIfTrue?: unknown;
  valueIfFalse?: unknown;
  lookupTable?: string;
  lookupKey?: string;
  lookupValue?: string;
  defaultValue?: unknown;
  dateFormat?: string;
}

export interface Mapping {
  id: string;
  name: string;
  description?: string;
  sourceSchema: Record<string, unknown>;
  destinationSchema: Record<string, unknown>;
  rules: MappingRule[];
  rulesCount?: number;
  writeMode?: WriteModeType;
  matchField?: string;
  filterConfig?: Record<string, unknown>;
  dryRunPassed?: boolean;
  isProduction?: boolean;
  sourceConnectorId?: string;
  sourceOperationId?: string;
  destinationConnectorId?: string;
  destinationOperationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMappingDto {
  name: string;
  description?: string;
  sourceSchema: Record<string, unknown>;
  destinationSchema: Record<string, unknown>;
  rules: MappingRule[];
  writeMode?: WriteModeType;
  matchField?: string;
  filterConfig?: Record<string, unknown>;
  sourceConnectorId?: string;
  sourceOperationId?: string;
  destinationConnectorId?: string;
  destinationOperationId?: string;
}

export interface AuditLogEntry {
  id: string;
  tenantId: string;
  userId: string | null;
  action: string;
  resource: string;
  resourceId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface AuditLogsResponse {
  logs: AuditLogEntry[];
  total: number;
}
