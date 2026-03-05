/**
 * Interface décrivant la structure d'un fichier openapi.json de connecteur.
 */

export interface ConnectorMeta {
  id: string;
  name: string;
  version: string;
  icon: string;
  category: string;
  auth_type: 'oauth2' | 'api_key' | 'basic' | 'oauth1';
  modes?: string[];
  docs_url: string | null;
}

export interface AuthConfig {
  token_url?: string;
  scopes?: string[];
  api_key_header?: string;
  base_url_param?: string;
  auth_method?: string;
  username_param?: string;
  password_param?: string;
  password_value?: string;
  consumer_key_param?: string;
  consumer_secret_param?: string;
  protocol_param?: string;
  host_param?: string;
  port_param?: string;
  private_key_param?: string;
}

export interface SchemaProperty {
  type: string;
  description?: string;
  format?: string;
  enum?: string[];
  default?: unknown;
  maxLength?: number;
  properties?: Record<string, SchemaProperty>;
  items?: SchemaProperty;
  required?: string[];
}

export interface OperationSchema {
  type: string;
  description?: string;
  required?: string[];
  properties?: Record<string, SchemaProperty>;
}

export interface ConnectorOperation {
  id: string;
  label: string;
  type: 'source' | 'destination' | 'trigger';
  method: string;
  path?: string;
  description?: string;
  pagination?: 'cursor' | 'offset';
  pagination_param?: string;
  file_format?: string;
  file_encoding?: string;
  file_separator?: string;
  file_pattern?: string;
  input_schema?: OperationSchema;
  output_schema?: OperationSchema;
  config_schema?: OperationSchema;
}

export interface ConnectorDefinition {
  connector_meta: ConnectorMeta;
  auth_config: AuthConfig;
  operations: ConnectorOperation[];
}

export interface LoadedConnector extends ConnectorDefinition {
  filePath: string;
  loadedAt: Date;
}
