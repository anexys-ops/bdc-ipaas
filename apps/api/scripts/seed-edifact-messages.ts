/**
 * Seed des messages EDIFACT pour le tenant demo : au moins 4539 messages
 * avec types ORDERS, HANMOV, INVOIC, PRICAT, DESADV.
 * À lancer : cd apps/api && pnpm run seed:edifact
 */
import * as path from 'path';
import * as fs from 'fs';

(function loadEnv(): void {
  const dotenv = require('dotenv');
  const cwd = process.cwd();
  const apiDir = cwd;
  const rootDir = path.join(cwd, '..', '..');
  const dockerDir = path.join(rootDir, 'docker');
  const toLoad: string[] = [
    path.join(rootDir, '.env'),
    path.join(rootDir, '.env.production'),
    path.join(dockerDir, '.env'),
    path.join(apiDir, '.env'),
  ];
  for (const envPath of toLoad) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: true });
    }
  }
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && dbUrl.includes('@postgres:') && !process.env.SEED_FROM_DOCKER) {
    process.env.DATABASE_URL = dbUrl.replace('@postgres:', '@localhost:');
  }
})();

import { PrismaClient as MasterPrisma } from '../src/generated/master';

const masterPrisma = new MasterPrisma();
const DEMO_SLUG = 'demo';

const MESSAGE_TYPES = ['ORDERS', 'HANMOV', 'INVOIC', 'PRICAT', 'DESADV'] as const;
const DIRECTIONS = ['INBOUND', 'OUTBOUND'] as const;
const SENDERS = ['PARTNER_A', 'PARTNER_B', 'PARTNER_C', 'EDIFACT_SYS', 'SAGE_EDI'];
const RECEIVERS = ['ANEXYS_EDI', 'PARTNER_B', 'PARTNER_A', 'SAGE_100', 'SELLSY'];
const STATUSES = ['RECEIVED', 'PROCESSED', 'ERROR'];

function randomChoice<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeBatch(batchSize: number, offset: number): Array<{
  type: string;
  direction: string;
  sender: string;
  receiver: string;
  rawContent: string;
  reference: string | null;
  receivedAt: Date;
  status: string;
}> {
  const batch: Array<{
    type: string;
    direction: string;
    sender: string;
    receiver: string;
    rawContent: string;
    reference: string | null;
    receivedAt: Date;
    status: string;
  }> = [];
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  for (let i = 0; i < batchSize; i++) {
    const idx = offset + i;
    const type = MESSAGE_TYPES[idx % MESSAGE_TYPES.length];
    batch.push({
      type,
      direction: randomChoice(DIRECTIONS),
      sender: randomChoice(SENDERS),
      receiver: randomChoice(RECEIVERS),
      rawContent: `UNB+UNOC:3+${randomChoice(SENDERS)}+${randomChoice(RECEIVERS)}+${new Date(now - i * 60000).toISOString().slice(0, 12).replace(/-|T/g, '')}+${String(idx).padStart(6, '0')}'`,
      reference: `REF-${type}-${idx}`,
      receivedAt: new Date(now - Math.floor(Math.random() * 90) * oneDayMs),
      status: randomChoice(STATUSES),
    });
  }
  return batch;
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL manquante.');
  }

  const tenant = await masterPrisma.tenant.findUnique({ where: { slug: DEMO_SLUG } });
  if (!tenant) {
    throw new Error('Tenant "demo" introuvable. Lancez d\'abord : pnpm run prisma:seed');
  }

  const url = new URL(databaseUrl);
  url.pathname = `/${tenant.dbName}`;
  const tenantDbUrl = url.toString();
  process.env.TENANT_DATABASE_URL = tenantDbUrl;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaClient: TenantPrisma } = require('../src/generated/tenant');
  const tenantPrisma = new TenantPrisma();

  const TARGET = 4539;
  const BATCH_SIZE = 500;
  let inserted = 0;
  const existing = await tenantPrisma.edifactMessage.count();
  if (existing >= TARGET) {
    console.log(`Déjà ${existing} messages EDIFACT (>= ${TARGET}). Rien à faire.`);
    await tenantPrisma.$disconnect();
    return;
  }

  const toInsert = TARGET - existing;
  console.log(`Insertion de ${toInsert} messages EDIFACT (types: ORDERS, HANMOV, INVOIC, PRICAT, DESADV)...`);

  for (let offset = 0; offset < toInsert; offset += BATCH_SIZE) {
    const size = Math.min(BATCH_SIZE, toInsert - offset);
    const batch = makeBatch(size, existing + offset);
    await tenantPrisma.edifactMessage.createMany({
      data: batch,
    });
    inserted += size;
    console.log(`  ${inserted}/${toInsert}`);
  }

  const total = await tenantPrisma.edifactMessage.count();
  console.log(`Seed EDIFACT terminé. Total messages: ${total}`);
  await tenantPrisma.$disconnect();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => masterPrisma.$disconnect());
