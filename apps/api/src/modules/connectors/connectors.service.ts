import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '../../generated/tenant';
import { VaultService } from '../vault/vault.service';
import { ConnectorRegistryService } from './connector-registry.service';
import { LoadedConnector } from './interfaces';
import { TenantDatabaseService } from '../tenants/tenant-database.service';
import { TenantsService } from '../tenants/tenants.service';
import {
  CreateConnectorDto,
  UpdateConnectorDto,
  ConnectorResponseDto,
  TestConnectorResponseDto,
  OperationPreviewResponseDto,
  RetrievalTestsListResponseDto,
} from './dto';

/**
 * Service CRUD des connecteurs configurés par tenant.
 */
@Injectable()
export class ConnectorsService {
  private readonly logger = new Logger(ConnectorsService.name);

  constructor(
    private readonly vaultService: VaultService,
    private readonly registryService: ConnectorRegistryService,
    private readonly tenantDbService: TenantDatabaseService,
    private readonly tenantsService: TenantsService,
  ) {}

  /**
   * Récupère le client Prisma pour un tenant.
   */
  private async getTenantClient(tenantId: string): Promise<PrismaClient> {
    const tenant = await this.tenantsService.getTenantWithHash(tenantId);
    return this.tenantDbService.getClient(tenantId, tenant.dbConnectionHash);
  }

  /**
   * Crée un nouveau connecteur configuré pour un tenant.
   */
  async create(tenantId: string, dto: CreateConnectorDto): Promise<ConnectorResponseDto> {
    const connectorDef = this.registryService.getById(dto.type);
    if (!connectorDef) {
      throw new BadRequestException(`Type de connecteur inconnu: ${dto.type}`);
    }

    const configHash = this.vaultService.encryptObject(dto.config);

    const prisma = await this.getTenantClient(tenantId);

    const connector = await prisma.connector.create({
      data: {
        type: dto.type,
        name: dto.name,
        configHash,
      },
    });

    this.logger.log(`Connecteur créé: ${connector.id} (${dto.type}) pour tenant ${tenantId}`);

    return this.mapToResponse(connector, connectorDef.connector_meta);
  }

  /**
   * Récupère tous les connecteurs d'un tenant.
   */
  async findAll(tenantId: string): Promise<ConnectorResponseDto[]> {
    const prisma = await this.getTenantClient(tenantId);

    const connectors = await prisma.connector.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return connectors.map((c) => {
      const def = this.registryService.getById(c.type);
      return this.mapToResponse(c, def?.connector_meta);
    });
  }

  /**
   * Récupère un connecteur par son ID.
   */
  async findOne(tenantId: string, connectorId: string): Promise<ConnectorResponseDto> {
    const prisma = await this.getTenantClient(tenantId);

    const connector = await prisma.connector.findUnique({
      where: { id: connectorId },
    });

    if (!connector) {
      throw new NotFoundException(`Connecteur non trouvé: ${connectorId}`);
    }

    const def = this.registryService.getById(connector.type);
    return this.mapToResponse(connector, def?.connector_meta);
  }

  /**
   * Met à jour un connecteur.
   */
  async update(
    tenantId: string,
    connectorId: string,
    dto: UpdateConnectorDto,
  ): Promise<ConnectorResponseDto> {
    const prisma = await this.getTenantClient(tenantId);

    const existing = await prisma.connector.findUnique({
      where: { id: connectorId },
    });

    if (!existing) {
      throw new NotFoundException(`Connecteur non trouvé: ${connectorId}`);
    }

    const updateData: Record<string, unknown> = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name;
    }

    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    if (dto.config !== undefined) {
      updateData.configHash = this.vaultService.encryptObject(dto.config);
    }

    const connector = await prisma.connector.update({
      where: { id: connectorId },
      data: updateData,
    });

    this.logger.log(`Connecteur mis à jour: ${connectorId}`);

    const def = this.registryService.getById(connector.type);
    return this.mapToResponse(connector, def?.connector_meta);
  }

  /**
   * Supprime un connecteur.
   */
  async delete(tenantId: string, connectorId: string): Promise<void> {
    const prisma = await this.getTenantClient(tenantId);

    const existing = await prisma.connector.findUnique({
      where: { id: connectorId },
    });

    if (!existing) {
      throw new NotFoundException(`Connecteur non trouvé: ${connectorId}`);
    }

    await prisma.connector.delete({
      where: { id: connectorId },
    });

    this.logger.log(`Connecteur supprimé: ${connectorId}`);
  }

  /**
   * Teste une configuration sans enregistrer de connecteur (pour le formulaire de configuration).
   */
  async testConfig(
    connectorType: string,
    config: Record<string, unknown>,
  ): Promise<TestConnectorResponseDto> {
    const connectorDef = this.registryService.getById(connectorType);
    if (!connectorDef) {
      throw new BadRequestException(`Type de connecteur inconnu: ${connectorType}`);
    }

    if (connectorDef.connector_meta.auth_type === 'agent') {
      return {
        success: true,
        message: 'Connecteur agent : téléchargez et installez l’agent pour activer la connexion.',
        durationMs: 0,
      };
    }

    const startTime = Date.now();
    try {
      const configToTest = await this.ensureOAuth2AccessToken(
        connectorDef.connector_meta.auth_type,
        connectorDef.auth_config as Record<string, unknown>,
        { ...config, connector_type: connectorType },
      );
      const result = await this.performConnectionTest(
        connectorDef.connector_meta.auth_type,
        configToTest,
        connectorDef.auth_config as Record<string, unknown>,
      );
      const durationMs = Date.now() - startTime;
      return {
        success: result.success,
        message: result.message,
        durationMs,
        details: result.details,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      return {
        success: false,
        message: `Échec du test: ${errorMessage}`,
        durationMs,
      };
    }
  }

  /**
   * Teste la connexion d'un connecteur.
   */
  async testConnection(
    tenantId: string,
    connectorId: string,
  ): Promise<TestConnectorResponseDto> {
    const prisma = await this.getTenantClient(tenantId);

    const connector = await prisma.connector.findUnique({
      where: { id: connectorId },
    });

    if (!connector) {
      throw new NotFoundException(`Connecteur non trouvé: ${connectorId}`);
    }

    const connectorDef = this.registryService.getById(connector.type);
    if (!connectorDef) {
      throw new BadRequestException(`Type de connecteur inconnu: ${connector.type}`);
    }

    if (connectorDef.connector_meta.auth_type === 'agent') {
      await prisma.connector.update({
        where: { id: connectorId },
        data: { lastTestedAt: new Date(), lastTestOk: true },
      });
      return {
        success: true,
        message: 'Connecteur agent : l’agent doit être installé et connecté.',
        durationMs: 0,
      };
    }

    const config = this.vaultService.decryptObject<Record<string, unknown>>(connector.configHash);
    const startTime = Date.now();

    try {
      const configToTest = await this.ensureOAuth2AccessToken(
        connectorDef.connector_meta.auth_type,
        connectorDef.auth_config as Record<string, unknown>,
        { ...config, connector_type: connector.type },
      );
      const result = await this.performConnectionTest(
        connectorDef.connector_meta.auth_type,
        configToTest,
        connectorDef.auth_config as Record<string, unknown>,
      );
      const durationMs = Date.now() - startTime;

      await prisma.connector.update({
        where: { id: connectorId },
        data: {
          lastTestedAt: new Date(),
          lastTestOk: result.success,
        },
      });

      return {
        success: result.success,
        message: result.message,
        durationMs,
        details: result.details,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';

      await prisma.connector.update({
        where: { id: connectorId },
        data: {
          lastTestedAt: new Date(),
          lastTestOk: false,
        },
      });

      return {
        success: false,
        message: `Échec du test: ${errorMessage}`,
        durationMs,
      };
    }
  }

  /**
   * Effectue le test de connexion selon le type d'authentification.
   * authConfig : optionnel, contient par ex. api_key_header (Dolibarr = DOLAPIKEY), base_url_param, etc.
   */
  private async performConnectionTest(
    authType: string,
    config: Record<string, unknown>,
    authConfig?: Record<string, unknown>,
  ): Promise<{ success: boolean; message: string; details?: Record<string, unknown> }> {
    switch (authType) {
      case 'api_key': {
        const baseUrl = (config.base_url as string | undefined)?.trim();
        if (!baseUrl) {
          return { success: false, message: 'URL de base non configurée' };
        }

        const apiKeyHeader = (authConfig?.api_key_header as string) ?? 'X-API-Key';
        const apiKey = config.api_key as string | undefined;

        try {
          const headers: Record<string, string> = {};
          if (apiKey) headers[apiKeyHeader] = apiKey;

          const response = await fetch(baseUrl, {
            method: 'GET',
            headers: Object.keys(headers).length ? headers : undefined,
          });

          return {
            success: response.ok || response.status === 401,
            message: response.ok ? 'Connexion réussie' : `Status: ${response.status}`,
            details: { status: response.status },
          };
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Erreur réseau';
          return { success: false, message: msg };
        }
      }

      case 'oauth2': {
        const hasTokens = config.access_token || config.refresh_token;
        return {
          success: Boolean(hasTokens),
          message: hasTokens ? 'Tokens OAuth2 configurés' : 'Aucun token OAuth2',
        };
      }

      case 'basic': {
        const hasCredentials = config.username && config.password;
        const baseUrl = config.base_url as string | undefined;

        if (!hasCredentials) {
          return { success: false, message: 'Identifiants non configurés' };
        }

        if (baseUrl) {
          try {
            const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
            const response = await fetch(baseUrl, {
              method: 'HEAD',
              headers: { Authorization: `Basic ${auth}` },
            });

            return {
              success: response.ok,
              message: response.ok ? 'Connexion réussie' : `Status: ${response.status}`,
            };
          } catch (error) {
            const msg = error instanceof Error ? error.message : 'Erreur réseau';
            return { success: false, message: msg };
          }
        }

        return { success: true, message: 'Identifiants configurés' };
      }

      default:
        return { success: true, message: 'Configuration validée' };
    }
  }

  /**
   * Exécute une opération source (ex: list_contacts) et retourne un aperçu des données.
   */
  async runSourceOperation(
    tenantId: string,
    connectorId: string,
    operationId: string,
    limit: number = 50,
  ): Promise<OperationPreviewResponseDto> {
    const prisma = await this.getTenantClient(tenantId);

    const connector = await prisma.connector.findUnique({
      where: { id: connectorId },
    });

    if (!connector) {
      throw new NotFoundException(`Connecteur non trouvé: ${connectorId}`);
    }

    const connectorDef = this.registryService.getById(connector.type);
    if (!connectorDef) {
      throw new BadRequestException(`Type de connecteur inconnu: ${connector.type}`);
    }

    const config = this.vaultService.decryptObject<Record<string, unknown>>(connector.configHash);
    return this.runSourceOperationWithConfig(
      connector.type,
      operationId,
      config,
      limit,
      connectorDef,
    );
  }

  /**
   * Exécute une opération source avec une config fournie (pour tests de récupération sans connecteur enregistré).
   */
  async runSourceOperationWithConfig(
    connectorType: string,
    operationId: string,
    config: Record<string, unknown>,
    limit: number = 50,
    connectorDef?: LoadedConnector,
  ): Promise<OperationPreviewResponseDto> {
    const def = connectorDef ?? this.registryService.getById(connectorType);
    if (!def) {
      throw new BadRequestException(`Type de connecteur inconnu: ${connectorType}`);
    }

    const operation = def.operations.find(
      (op) => op.id === operationId && op.type === 'source',
    );
    if (!operation || !operation.path) {
      throw new BadRequestException(
        `Opération source "${operationId}" introuvable pour ce connecteur`,
      );
    }

    const configWithType = { ...config, connector_type: connectorType };
    let configWithToken = await this.ensureOAuth2AccessToken(
      def.connector_meta.auth_type,
      def.auth_config as Record<string, unknown>,
      configWithType,
    );
    let { url, headers } = this.buildRequestConfig(
      def.connector_meta.auth_type,
      def.auth_config as Record<string, unknown>,
      configWithToken,
      operation,
      limit,
    );

    let response = await fetch(url, { method: operation.method, headers });

    // OAuth2 : en cas de 401 (token expiré ou révoqué), obtenir un nouveau token et réessayer une fois
    if (
      response.status === 401 &&
      def.connector_meta.auth_type === 'oauth2' &&
      configWithToken.access_token
    ) {
      const configWithoutToken = { ...configWithType, access_token: undefined };
      configWithToken = await this.ensureOAuth2AccessToken(
        def.connector_meta.auth_type,
        def.auth_config as Record<string, unknown>,
        configWithoutToken,
      );
      const retry = this.buildRequestConfig(
        def.connector_meta.auth_type,
        def.auth_config as Record<string, unknown>,
        configWithToken,
        operation,
        limit,
      );
      response = await fetch(retry.url, {
        method: operation.method,
        headers: retry.headers,
      });
      if (response.ok) {
        url = retry.url;
        headers = retry.headers;
      }
    }

    if (!response.ok) {
      const text = await response.text();
      const curlEquivalent = this.buildCurlEquivalent(operation.method, url, headers);
      throw new BadRequestException(
        `API externe: ${response.status} ${response.statusText}. ${text.slice(0, 200)}` +
          (curlEquivalent ? `\n\nPour reproduire (curl):\n${curlEquivalent}` : ''),
      );
    }

    const body = (await response.json()) as unknown;
    const items = this.normalizeItemsArray(body);
    const limited = items.slice(0, limit);

    return { count: limited.length, items: limited };
  }

  /**
   * Pour OAuth2 : si pas d'access_token mais client_id + client_secret, récupère le token (Client Credentials).
   */
  private async ensureOAuth2AccessToken(
    authType: string,
    authConfig: Record<string, unknown>,
    config: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    if (authType !== 'oauth2') return config;
    if (config.access_token && String(config.access_token).trim()) return config;

    const tokenUrl = authConfig.token_url as string | undefined;
    const clientId = config.client_id as string | undefined;
    const clientSecret = config.client_secret as string | undefined;
    if (!tokenUrl?.trim() || !clientId?.trim() || !clientSecret?.trim()) {
      return config;
    }

    try {
      const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      });
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new BadRequestException(
          `Impossible d'obtenir le token OAuth2: ${response.status}. ${text.slice(0, 200)}`,
        );
      }
      const data = (await response.json()) as { access_token?: string };
      const accessToken = data.access_token;
      if (!accessToken) {
        throw new BadRequestException('Réponse OAuth2 sans access_token');
      }
      return { ...config, access_token: accessToken };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      const msg = error instanceof Error ? error.message : 'Erreur réseau';
      throw new BadRequestException(`OAuth2 Client Credentials: ${msg}`);
    }
  }

  private getBaseUrl(connectorType: string, config: Record<string, unknown>): string {
    let fromConfig =
      (config.base_url as string | undefined) ?? (config.shop_url as string | undefined);
    if (fromConfig?.trim()) {
      fromConfig = fromConfig.trim().replace(/\/$/, '');
      // Sellsy : login.sellsy.com est pour OAuth uniquement ; les appels API doivent aller sur api.sellsy.com/v2
      if (connectorType === 'sellsy' && fromConfig.includes('login.sellsy.com')) {
        fromConfig = '';
      }
      if (fromConfig) {
        // Dolibarr : si l'URL ne contient pas /api/index.php, l'ajouter (ex: https://luxgreen.fr → https://luxgreen.fr/api/index.php)
        if (connectorType === 'dolibarr' && !fromConfig.includes('api/index.php')) {
          fromConfig = `${fromConfig}/api/index.php`;
        }
        return fromConfig;
      }
    }
    const defaults: Record<string, string> = {
      sellsy: 'https://api.sellsy.com/v2',
      stripe: 'https://api.stripe.com',
      hubspot: 'https://api.hubapi.com',
      slack: 'https://slack.com/api',
      github: 'https://api.github.com',
      'google-sheets': 'https://sheets.googleapis.com/v4',
      airtable: 'https://api.airtable.com/v0',
      monday: 'https://api.monday.com/v2',
      notion: 'https://api.notion.com/v1',
      asana: 'https://app.asana.com/api/1.0',
      trello: 'https://api.trello.com/1',
    };
    const defaultUrl = connectorType ? defaults[connectorType] : undefined;
    if (defaultUrl) return defaultUrl;
    throw new BadRequestException('URL de base (base_url) non configurée');
  }

  private buildRequestConfig(
    authType: string,
    authConfig: Record<string, unknown>,
    config: Record<string, unknown>,
    operation: { path?: string; method: string },
    limit: number,
  ): { url: string; headers: Record<string, string> } {
    const baseUrl = this.getBaseUrl(
      (config.connector_type as string) ?? '',
      config,
    );
    let path = (operation.path ?? '').replace(/^\//, '');
    // Remplacer les paramètres de chemin {id}, {contactId}, etc. par une valeur par défaut pour l'aperçu
    // (évite 403 des APIs qui rejettent le littéral {id} pour cause d'injection)
    path = path.replace(/\{[^}]+\}/g, '1');
    const urlObj = new URL(`${baseUrl}/${path}`);
    urlObj.searchParams.set('limit', String(Math.min(limit, 100)));

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    switch (authType) {
      case 'oauth2': {
        const token = config.access_token as string | undefined;
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        break;
      }
      case 'api_key': {
        const apiKey = config.api_key as string | undefined;
        const headerName = (authConfig.api_key_header as string) ?? 'X-API-Key';
        if (apiKey) {
          headers[headerName] = apiKey;
        }
        break;
      }
      case 'basic': {
        const username = config.username as string | undefined;
        const password = config.password as string | undefined;
        if (username !== undefined && username !== '') {
          const encoded = Buffer.from(`${username}:${password ?? ''}`).toString('base64');
          headers['Authorization'] = `Basic ${encoded}`;
        }
        break;
      }
      default:
        break;
    }

    return { url: urlObj.toString(), headers };
  }

  /**
   * Construit une chaîne curl équivalente à la requête (pour debug).
   * Masque le token dans Authorization pour ne pas l'exposer en clair.
   */
  private buildCurlEquivalent(
    method: string,
    url: string,
    headers: Record<string, string>,
  ): string {
    const parts = ['curl', '-X', method, `'${url}'`];
    for (const [key, value] of Object.entries(headers)) {
      const displayValue =
        key.toLowerCase() === 'authorization' && value.startsWith('Bearer ')
          ? 'Bearer <ACCESS_TOKEN>'
          : value;
      parts.push('-H', `'${key}: ${displayValue}'`);
    }
    return parts.join(' \\\n  ');
  }

  private normalizeItemsArray(body: unknown): Record<string, unknown>[] {
    if (Array.isArray(body)) {
      return body as Record<string, unknown>[];
    }
    if (body && typeof body === 'object') {
      const obj = body as Record<string, unknown>;
      if (Array.isArray(obj.data)) {
        return obj.data as Record<string, unknown>[];
      }
      if (Array.isArray(obj.items)) {
        return obj.items as Record<string, unknown>[];
      }
      if (Array.isArray(obj.results)) {
        return obj.results as Record<string, unknown>[];
      }
      if (Array.isArray(obj.contacts)) {
        return obj.contacts as Record<string, unknown>[];
      }
      if (Array.isArray(obj.result)) {
        return obj.result as Record<string, unknown>[];
      }
    }
    return [];
  }

  /**
   * Liste tous les connecteurs et leurs opérations source (pour les tests de récupération).
   */
  listSourceOperationsForRetrievalTests(): RetrievalTestsListResponseDto {
    const all = this.registryService.getAll();
    const connectors = all.map((c) => ({
      connectorId: c.connector_meta.id,
      connectorName: c.connector_meta.name,
      operations: c.operations
        .filter((op) => op.type === 'source' && op.path)
        .map((op) => ({
          id: op.id,
          label: op.label,
          method: op.method,
          path: op.path ?? '',
        })),
    }));
    return { connectors };
  }

  /**
   * Récupère la configuration déchiffrée d'un connecteur.
   */
  async getDecryptedConfig(tenantId: string, connectorId: string): Promise<Record<string, unknown>> {
    const prisma = await this.getTenantClient(tenantId);

    const connector = await prisma.connector.findUnique({
      where: { id: connectorId },
    });

    if (!connector) {
      throw new NotFoundException(`Connecteur non trouvé: ${connectorId}`);
    }

    return this.vaultService.decryptObject<Record<string, unknown>>(connector.configHash);
  }

  /**
   * Mappe un connecteur vers le DTO de réponse.
   */
  private mapToResponse(
    connector: {
      id: string;
      type: string;
      name: string;
      isActive: boolean;
      lastTestedAt: Date | null;
      lastTestOk: boolean | null;
      createdAt: Date;
    },
    meta?: {
      name: string;
      icon: string;
      category: string;
      auth_type: string;
    },
  ): ConnectorResponseDto {
    return {
      id: connector.id,
      type: connector.type,
      name: connector.name,
      isActive: connector.isActive,
      lastTestedAt: connector.lastTestedAt,
      lastTestOk: connector.lastTestOk,
      createdAt: connector.createdAt,
      connectorInfo: meta ?? {
        name: connector.type,
        icon: 'unknown.svg',
        category: 'Inconnu',
        auth_type: 'unknown',
      },
    };
  }
}
