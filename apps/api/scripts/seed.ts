/**
 * Seed : crée un tenant "demo" et un utilisateur admin pour le premier accès.
 * À lancer une fois : cd apps/api && pnpm run prisma:seed
 */
import 'dotenv/config';
import { execSync } from 'child_process';
import * as crypto from 'crypto';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import { PrismaClient, Plan, Role } from '../src/generated/master';

const prisma = new PrismaClient();

const DEMO_SLUG = 'demo';
const DEMO_DB_NAME = 'db_demo';
const ADMIN_EMAIL = 'admin@anexys.fr';
const ADMIN_PASSWORD = 'MotDePasse123!';

function encryptVault(plaintext: string, vaultKeyHex: string): string {
  if (vaultKeyHex.length !== 64) throw new Error('VAULT_KEY doit faire 64 caractères hex');
  const key = Buffer.from(vaultKeyHex, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  const vaultKey = process.env.VAULT_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  if (!databaseUrl) {
    throw new Error('DATABASE_URL manquante. Lancez depuis apps/api avec .env chargé.');
  }

  const url = new URL(databaseUrl);
  url.pathname = `/${DEMO_DB_NAME}`;
  const tenantDbUrl = url.toString();

  console.log('Création de la base tenant si nécessaire...');
  try {
    await prisma.$executeRawUnsafe(`CREATE DATABASE "db_demo"`);
    console.log(`Base ${DEMO_DB_NAME} créée.`);
  } catch (e: unknown) {
    const err = e as { meta?: { code?: string }; code?: string };
    if (err?.meta?.code === '42P04' || err?.code === 'P2010') {
      console.log(`Base ${DEMO_DB_NAME} existe déjà.`);
    } else {
      throw e;
    }
  }

  console.log('Application du schéma tenant (db push)...');
  const schemaPath = path.join(__dirname, '../src/prisma/tenant.prisma');
  const env = { ...process.env, DATABASE_URL: tenantDbUrl, TENANT_DATABASE_URL: tenantDbUrl };
  execSync(
    `npx prisma db push --schema=${schemaPath}`,
    { env, stdio: 'inherit' },
  );

  const existingTenant = await prisma.tenant.findUnique({ where: { slug: DEMO_SLUG } });
  if (existingTenant) {
    console.log('Tenant "demo" et utilisateur déjà présents. Seed ignoré.');
    return;
  }

  const dbConnectionHash = encryptVault(tenantDbUrl, vaultKey);
  const tenant = await prisma.tenant.create({
    data: {
      slug: DEMO_SLUG,
      name: 'Demo',
      dbName: DEMO_DB_NAME,
      dbConnectionHash,
      plan: Plan.FREE,
    },
  });

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: ADMIN_EMAIL.toLowerCase(),
      passwordHash,
      firstName: 'Admin',
      lastName: 'ANEXYS',
      role: Role.SUPER_ADMIN,
    },
  });

  console.log(`Tenant "${DEMO_SLUG}" et utilisateur ${ADMIN_EMAIL} créés.`);
  console.log(`Connexion : ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
