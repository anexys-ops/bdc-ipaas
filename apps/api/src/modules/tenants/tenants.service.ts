import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { VaultService } from '../vault/vault.service';
import { TenantDatabaseService } from './tenant-database.service';
import {
  CreateTenantDto,
  UpdateTenantDto,
  TenantResponseDto,
  TenantStatsDto,
  TenantConnectorDto,
  TenantUserDto,
  CreateTenantUserDto,
  UpdateTenantUserDto,
  Plan,
} from './dto';
import * as bcrypt from 'bcrypt';
import { Role } from '../../generated/master';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

/** Résout le chemin du schéma tenant (source ou dist) pour que les commandes Prisma fonctionnent. */
function resolveTenantSchemaPath(): string {
  const candidates = [
    path.join(process.cwd(), 'src/prisma/tenant.prisma'),
    path.join(process.cwd(), 'apps/api/src/prisma/tenant.prisma'),
    path.join(__dirname, '../../prisma/tenant.prisma'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0];
}

/**
 * Service de gestion des tenants (organisations).
 * Gère la création des bases de données tenant et les migrations.
 */
@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vaultService: VaultService,
    private readonly configService: ConfigService,
    private readonly tenantDbService: TenantDatabaseService,
  ) {}

  /**
   * Crée un nouveau tenant avec sa base de données dédiée.
   */
  async create(createTenantDto: CreateTenantDto): Promise<TenantResponseDto> {
    const { slug, name, plan = Plan.FREE } = createTenantDto;

    const existing = await this.prisma.tenant.findFirst({
      where: {
        OR: [{ slug }],
      },
    });

    if (existing) {
      throw new ConflictException(`Un tenant avec le slug "${slug}" existe déjà`);
    }

    const dbName = `db_${slug.replace(/-/g, '_')}`;

    const existingDb = await this.prisma.tenant.findUnique({
      where: { dbName },
    });

    if (existingDb) {
      throw new ConflictException(`La base de données "${dbName}" existe déjà`);
    }

    try {
      await this.createTenantDatabase(dbName);
      this.logger.log(`Base de données créée: ${dbName}`);
    } catch (error) {
      this.logger.error(`Erreur création DB tenant: ${dbName}`, error);
      throw new InternalServerErrorException('Erreur lors de la création de la base de données');
    }

    const connectionString = this.buildTenantConnectionString(dbName);
    const dbConnectionHash = this.vaultService.encrypt(connectionString);

    try {
      await this.runTenantMigrations(connectionString);
      this.logger.log(`Migrations appliquées pour: ${dbName}`);
    } catch (error) {
      this.logger.error(`Erreur migrations tenant: ${dbName}`, error);
      await this.dropTenantDatabase(dbName);
      throw new InternalServerErrorException('Erreur lors des migrations de la base de données');
    }

    const tenant = await this.prisma.tenant.create({
      data: {
        slug,
        name,
        dbName,
        dbConnectionHash,
        plan,
      },
    });

    this.logger.log(`Tenant créé: ${tenant.id} (${slug})`);

    return this.mapToResponse(tenant);
  }

  /**
   * Récupère tous les tenants, optionnellement avec stats (back office).
   */
  async findAll(options?: { withStats?: boolean }): Promise<(TenantResponseDto & { stats?: TenantStatsDto })[]> {
    const tenants = await this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const list = tenants.map((t) => this.mapToResponse(t));

    if (options?.withStats) {
      const withStats = await Promise.all(
        list.map(async (t) => {
          try {
            const stats = await this.getStats(t.id);
            return { ...t, stats };
          } catch {
            return { ...t, stats: { usersCount: 0, connectorsCount: 0, flowsCount: 0, executionsCount: 0, lastLoginAt: null } };
          }
        }),
      );
      return withStats;
    }

    return list;
  }

  /**
   * Récupère un tenant par son ID.
   */
  async findOne(id: string): Promise<TenantResponseDto> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant non trouvé: ${id}`);
    }

    return this.mapToResponse(tenant);
  }

  /**
   * Récupère les statistiques d'un tenant (back office).
   */
  async getStats(tenantId: string): Promise<TenantStatsDto> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant non trouvé: ${tenantId}`);
    }

    const [usersCount, connectorsCount, flowsCount, executionsCount, lastLoginAgg] = await Promise.all([
      this.prisma.user.count({ where: { tenantId } }),
      this.getTenantConnectorsCount(tenantId),
      this.getTenantFlowsCount(tenantId),
      this.getTenantExecutionsCount(tenantId),
      this.prisma.user.aggregate({
        where: { tenantId },
        _max: { lastLoginAt: true },
      }),
    ]);

    return {
      usersCount,
      connectorsCount,
      flowsCount,
      executionsCount,
      lastLoginAt: lastLoginAgg._max?.lastLoginAt ?? null,
    };
  }

  private async getTenantExecutionsCount(tenantId: string): Promise<number> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { dbConnectionHash: true },
    });
    if (!tenant) return 0;
    try {
      const client = await this.tenantDbService.getClient(tenantId, tenant.dbConnectionHash);
      return client.flowExecution.count();
    } catch {
      return 0;
    }
  }

  private async getTenantConnectorsCount(tenantId: string): Promise<number> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { dbConnectionHash: true },
    });
    if (!tenant) return 0;
    try {
      const client = await this.tenantDbService.getClient(tenantId, tenant.dbConnectionHash);
      return client.connector.count();
    } catch {
      return 0;
    }
  }

  private async getTenantFlowsCount(tenantId: string): Promise<number> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { dbConnectionHash: true },
    });
    if (!tenant) return 0;
    try {
      const client = await this.tenantDbService.getClient(tenantId, tenant.dbConnectionHash);
      return client.flow.count();
    } catch {
      return 0;
    }
  }

  /**
   * Liste les connecteurs d'un tenant (back office).
   */
  async getConnectors(tenantId: string): Promise<TenantConnectorDto[]> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { dbConnectionHash: true },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant non trouvé: ${tenantId}`);
    }
    const client = await this.tenantDbService.getClient(tenantId, tenant.dbConnectionHash);
    const connectors = await client.connector.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return connectors.map((c) => ({
      id: c.id,
      type: c.type,
      name: c.name,
      isActive: c.isActive,
      lastTestedAt: c.lastTestedAt,
      lastTestOk: c.lastTestOk,
      createdAt: c.createdAt,
    }));
  }

  /**
   * Liste les utilisateurs d'un tenant (back office).
   */
  async getUsers(tenantId: string): Promise<TenantUserDto[]> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant non trouvé: ${tenantId}`);
    }
    const users = await this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
      },
    });
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt,
    }));
  }

  /**
   * Récupère un tenant par son slug.
   */
  async findBySlug(slug: string): Promise<TenantResponseDto> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant non trouvé: ${slug}`);
    }

    return this.mapToResponse(tenant);
  }

  /**
   * Met à jour un tenant.
   */
  async update(id: string, updateTenantDto: UpdateTenantDto): Promise<TenantResponseDto> {
    const existing = await this.prisma.tenant.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Tenant non trouvé: ${id}`);
    }

    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: updateTenantDto,
    });

    this.logger.log(`Tenant mis à jour: ${tenant.id}`);

    return this.mapToResponse(tenant);
  }

  /**
   * Crée un utilisateur pour un tenant.
   */
  async createUser(tenantId: string, dto: CreateTenantUserDto): Promise<TenantUserDto> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException(`Tenant non trouvé: ${tenantId}`);
    }
    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: dto.email } },
    });
    if (existing) {
      throw new ConflictException(`Un utilisateur avec l'email ${dto.email} existe déjà pour ce client.`);
    }
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role as Role,
      },
    });
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
    };
  }

  /**
   * Met à jour un utilisateur d'un tenant.
   */
  async updateUser(tenantId: string, userId: string, dto: UpdateTenantUserDto): Promise<TenantUserDto> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user) {
      throw new NotFoundException(`Utilisateur non trouvé: ${userId}`);
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.role !== undefined && { role: dto.role as Role }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
    return {
      id: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      role: updated.role,
      isActive: updated.isActive,
      lastLoginAt: updated.lastLoginAt,
    };
  }

  /**
   * Supprime un connecteur d'un tenant (base tenant).
   */
  async deleteConnector(tenantId: string, connectorId: string): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, dbConnectionHash: true },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant non trouvé: ${tenantId}`);
    }
    const client = await this.tenantDbService.getClient(tenantId, tenant.dbConnectionHash);
    const connector = await client.connector.findUnique({
      where: { id: connectorId },
    });
    if (!connector) {
      throw new NotFoundException(`Connecteur non trouvé: ${connectorId}`);
    }
    await client.connector.delete({ where: { id: connectorId } });
    this.logger.log(`Connecteur ${connectorId} supprimé pour le tenant ${tenantId}`);
  }

  /**
   * Récupère la chaîne de connexion déchiffrée d'un tenant.
   */
  async getConnectionString(tenantId: string): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant non trouvé: ${tenantId}`);
    }

    return this.vaultService.decrypt(tenant.dbConnectionHash);
  }

  /**
   * Récupère les infos brutes d'un tenant (avec hash).
   */
  async getTenantWithHash(tenantId: string): Promise<{ id: string; slug: string; dbConnectionHash: string }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, slug: true, dbConnectionHash: true },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant non trouvé: ${tenantId}`);
    }

    return tenant;
  }

  /**
   * Impersonation : retourne un token JWT temporaire (15 min) pour le premier admin du tenant.
   * Permet au SUPER_ADMIN de se connecter en tant que ce client pour debug/support.
   */
  async impersonate(tenantId: string, _superAdminId: string): Promise<{ token: string; expiresIn: string; tenantName: string }> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException(`Tenant non trouvé: ${tenantId}`);
    if (!tenant.isActive) throw new BadRequestException('Ce client est suspendu');

    // Récupère le premier admin du tenant
    const adminUser = await this.prisma.user.findFirst({
      where: { tenantId, isActive: true, role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
      orderBy: { createdAt: 'asc' },
    });
    if (!adminUser) throw new NotFoundException('Aucun utilisateur admin actif pour ce client');

    // Génère un token JWT via JwtService (importé dans le module)
    const { JwtService } = await import('@nestjs/jwt');
    const jwtService = new JwtService({});
    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET') ?? 'default_secret';
    const token = jwtService.sign(
      { sub: adminUser.id, email: adminUser.email, role: adminUser.role, tenantId, impersonatedBy: _superAdminId },
      { secret: accessSecret, expiresIn: '15m' },
    );

    this.logger.warn(`SUPER_ADMIN ${_superAdminId} impersonnifie le tenant ${tenantId} (user: ${adminUser.email})`);
    return { token, expiresIn: '15 minutes', tenantName: tenant.name };
  }

  /**
   * Liste les flux d'un tenant (back office).
   */
  async getFlows(tenantId: string): Promise<Array<{ id: string; name: string; isActive: boolean; triggerType: string; environment: string; createdAt: Date }>> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { dbConnectionHash: true } });
    if (!tenant) throw new NotFoundException(`Tenant non trouvé: ${tenantId}`);
    try {
      const client = await this.tenantDbService.getClient(tenantId, tenant.dbConnectionHash);
      const flows = await client.flow.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { id: true, name: true, isActive: true, triggerType: true, environment: true, createdAt: true },
      });
      return flows;
    } catch {
      return [];
    }
  }

  /**
   * Informations de facturation d'un tenant (pour le back office).
   */
  async getBillingInfo(tenantId: string): Promise<{
    plan: string;
    stripeCustomerId: string | null;
    currentPeriodUsage: { flowsExecuted: number; recordsProcessed: number; apiCallsMade: number } | null;
  }> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException(`Tenant non trouvé: ${tenantId}`);

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const metric = await this.prisma.usageMetric.findUnique({
      where: { tenantId_periodStart: { tenantId, periodStart } },
    });

    return {
      plan: tenant.plan,
      stripeCustomerId: tenant.stripeCustomerId,
      currentPeriodUsage: metric ? {
        flowsExecuted: metric.flowsExecuted,
        recordsProcessed: Number(metric.recordsProcessed),
        apiCallsMade: metric.apiCallsMade,
      } : null,
    };
  }

  /**
   * Crée la base de données PostgreSQL pour un tenant.
   */
  private async createTenantDatabase(dbName: string): Promise<void> {
    const masterUrl = this.configService.get<string>('DATABASE_URL');
    if (!masterUrl) {
      throw new InternalServerErrorException('DATABASE_URL non configurée');
    }

    await this.prisma.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
  }

  /**
   * Supprime une base de données tenant (rollback en cas d'erreur).
   */
  private async dropTenantDatabase(dbName: string): Promise<void> {
    try {
      await this.prisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${dbName}"`);
      this.logger.log(`Base de données supprimée (rollback): ${dbName}`);
    } catch (error) {
      this.logger.error(`Erreur suppression DB: ${dbName}`, error);
    }
  }

  /**
   * Construit la chaîne de connexion pour une base tenant.
   */
  private buildTenantConnectionString(dbName: string): string {
    const masterUrl = this.configService.get<string>('DATABASE_URL');
    if (!masterUrl) {
      throw new InternalServerErrorException('DATABASE_URL non configurée');
    }

    const url = new URL(masterUrl);
    url.pathname = `/${dbName}`;

    return url.toString();
  }

  /**
   * Applique le schéma Prisma sur la base tenant (db push : pas d'historique de migrations).
   */
  private async runTenantMigrations(connectionString: string): Promise<void> {
    const schemaPath = resolveTenantSchemaPath();

    const { stdout, stderr } = await execAsync(
      `npx prisma db push --schema="${schemaPath}" --accept-data-loss`,
      {
        env: {
          ...process.env,
          DATABASE_URL: connectionString,
          TENANT_DATABASE_URL: connectionString,
        },
      },
    );

    if (stderr && !stderr.includes('Already in sync')) {
      this.logger.warn(`Prisma db push stderr: ${stderr}`);
    }

    if (stdout) {
      this.logger.debug(`Prisma db push stdout: ${stdout}`);
    }
  }

  /**
   * Mappe une entité Tenant vers le DTO de réponse.
   */
  private mapToResponse(tenant: {
    id: string;
    slug: string;
    name: string;
    plan: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    stripeCustomerId: string | null;
  }): TenantResponseDto {
    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      plan: tenant.plan,
      isActive: tenant.isActive,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
      stripeCustomerId: tenant.stripeCustomerId,
    };
  }
}
