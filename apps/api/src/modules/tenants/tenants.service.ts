import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { VaultService } from '../vault/vault.service';
import { CreateTenantDto, UpdateTenantDto, TenantResponseDto, Plan } from './dto';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

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
   * Récupère tous les tenants.
   */
  async findAll(): Promise<TenantResponseDto[]> {
    const tenants = await this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return tenants.map((t) => this.mapToResponse(t));
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
   * Exécute les migrations Prisma sur la base tenant.
   */
  private async runTenantMigrations(connectionString: string): Promise<void> {
    const schemaPath = path.join(__dirname, '../../prisma/tenant.prisma');

    const { stdout, stderr } = await execAsync(
      `DATABASE_URL="${connectionString}" TENANT_DATABASE_URL="${connectionString}" npx prisma migrate deploy --schema=${schemaPath}`,
      {
        env: {
          ...process.env,
          TENANT_DATABASE_URL: connectionString,
        },
      },
    );

    if (stderr && !stderr.includes('Already in sync')) {
      this.logger.warn(`Prisma migrate stderr: ${stderr}`);
    }

    if (stdout) {
      this.logger.debug(`Prisma migrate stdout: ${stdout}`);
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
