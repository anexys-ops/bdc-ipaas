/**
 * Interface décrivant la structure d'un fichier openapi.json de connecteur.
 */

/** Liens de téléchargement de l’agent (connexion sans API). */
export interface AgentDownloads {
  /** Nom ou URL du package Windows (ex: bdc-ipaas-agent-sage-1.0.0-win.exe) */
  windows?: string;
  /** Nom ou URL du package macOS (ex: bdc-ipaas-agent-sage-1.0.0-mac.dmg) */
  mac?: string;
}

export interface ConnectorMeta {
  id: string;
  name: string;
  version: string;
  icon: string;
  category: string;
  auth_type: 'oauth2' | 'api_key' | 'basic' | 'oauth1' | 'agent';
  modes?: string[];
  docs_url: string | null;
  /** Instructions pour configurer le connecteur (URL, clé API, etc.) par logiciel/module */
  config_instructions?: string;
  /** Pour auth_type agent : packages à télécharger (Windows / Mac). */
  agent_downloads?: AgentDownloads;
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

/** Champ de configuration pour le formulaire (URL, clé API, secret, refresh_token, etc.) */
export interface ConfigFieldDefinition {
  key: string;
  label: string;
  type: 'text' | 'password';
  required: boolean;
  placeholder?: string;
  description?: string;
}

export interface ConnectorDefinition {
  connector_meta: ConnectorMeta;
  auth_config: AuthConfig;
  operations: ConnectorOperation[];
  /** Champs du formulaire de configuration (optionnel). Si présent, utilisé à la place du build par défaut. */
  config_fields?: ConfigFieldDefinition[];
}

export interface LoadedConnector extends ConnectorDefinition {
  filePath: string;
  loadedAt: Date;
}
