/**
 * Seed des exemples : messages EDIFACT (tenant demo) + entrées marketplace (master).
 * Prérequis : tenant "demo" existant (pnpm run prisma:seed). Optionnel : pnpm run seed:demo pour les mappings Sage.
 * À lancer : cd apps/api && pnpm run seed:examples
 */
import * as path from 'path';
import * as fs from 'fs';

(function loadEnv(): void {
  const dotenv = require('dotenv');
  const cwd = process.cwd();
  const rootDir = path.join(cwd, '..', '..');
  const dockerDir = path.join(rootDir, 'docker');
  const toLoad: string[] = [
    path.join(rootDir, '.env'),
    path.join(rootDir, '.env.production'),
    path.join(dockerDir, '.env'),
    path.join(cwd, '.env'),
  ];
  for (const envPath of toLoad) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: true });
    }
  }
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && dbUrl.includes('@postgres:')) {
    process.env.DATABASE_URL = dbUrl.replace('@postgres:', '@localhost:');
  }
})();

import { PrismaClient as MasterPrisma } from '../src/generated/master';

const masterPrisma = new MasterPrisma();
const DEMO_SLUG = 'demo';

// Exemples de messages EDIFACT (extraits réalistes)
const EDIFACT_ORDERS =
  "UNB+UNOC:3+FR001:14+DE999:14+240315:1234+1'\nUNH+1+ORDERS:D:96A:UN'\nBGM+220+ORD-2024-001+9'\nDTM+137:202403151200:203'\nNAD+BY+FR001::9'\nNAD+SU+DE999::9'\nLIN+1++4012345678901:EN'\nQTY+21:100'\nUNT+8+1'\nUNZ+1+1'";
const EDIFACT_INVOIC =
  "UNB+UNOC:3+FR001:14+DE999:14+240316:0930+2'\nUNH+1+INVOIC:D:96A:UN'\nBGM+380+INV-2024-042+9'\nDTM+137:202403160930:203'\nNAD+SU+FR001::9'\nNAD+BY+DE999::9'\nLIN+1++4012345678901:EN'\nQTY+47:50'\nMOA+86:1250.00'\nUNT+9+1'\nUNZ+2+2'";
const EDIFACT_DESADV =
  "UNB+UNOC:3+DE999:14+FR001:14+240317:0800+3'\nUNH+1+DESADV:D:96A:UN'\nBGM+351+DES-2024-012+9'\nDTM+137:202403170800:203'\nNAD+SU+DE999::9'\nNAD+ST+FR001::9'\nCPS+1'\nPAC+1'\nLIN+1++4012345678901:EN'\nQTY+12:200'\nUNT+10+1'\nUNZ+3+3'";

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
  process.env.TENANT_DATABASE_URL = url.toString();

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaClient: TenantPrisma } = require('../src/generated/tenant');
  const tenantPrisma = new TenantPrisma();

  // ——— Messages EDIFACT (tenant) ———
  const existingEdifact = await tenantPrisma.edifactMessage.count();
  if (existingEdifact === 0) {
    console.log('Création des exemples de messages EDIFACT...');
    await tenantPrisma.edifactMessage.createMany({
      data: [
        {
          type: 'ORDERS',
          direction: 'INBOUND',
          sender: 'FR001',
          receiver: 'DE999',
          rawContent: EDIFACT_ORDERS,
          parsedData: { reference: 'ORD-2024-001', lineCount: 1 },
          reference: 'ORD-2024-001',
          status: 'PROCESSED',
          processedAt: new Date(),
        },
        {
          type: 'INVOIC',
          direction: 'INBOUND',
          sender: 'FR001',
          receiver: 'DE999',
          rawContent: EDIFACT_INVOIC,
          parsedData: { reference: 'INV-2024-042', amount: 1250 },
          reference: 'INV-2024-042',
          status: 'PROCESSED',
          processedAt: new Date(),
        },
        {
          type: 'DESADV',
          direction: 'INBOUND',
          sender: 'DE999',
          receiver: 'FR001',
          rawContent: EDIFACT_DESADV,
          parsedData: { reference: 'DES-2024-012', quantity: 200 },
          reference: 'DES-2024-012',
          status: 'RECEIVED',
        },
        {
          type: 'ORDERS',
          direction: 'OUTBOUND',
          sender: 'FR001',
          receiver: 'PARTENAIRE01',
          rawContent: EDIFACT_ORDERS,
          parsedData: null,
          reference: 'ORD-2024-002',
          status: 'RECEIVED',
        },
      ],
    });
    console.log('  4 messages EDIFACT créés (ORDERS, INVOIC, DESADV).');
  } else {
    console.log('Des messages EDIFACT existent déjà. Ignoré.');
  }

  // ——— Marketplace overlay (master) : Sage, Sellsy, Dolibarr, etc. ———
  const marketplaceConnectors = [
    { connectorId: 'sage', description: 'Connecteur Sage Compta : synchronisation des écritures, clients et tiers.' },
    { connectorId: 'sage-100', description: 'Sage 100 (SBO) : intégration avec Sage Business One.' },
    { connectorId: 'sellsy', description: 'Sellsy CRM : contacts, entreprises et facturation.' },
    { connectorId: 'dolibarr', description: 'Dolibarr ERP/CRM : tiers, factures et produits.' },
    { connectorId: 'taskit', description: 'Taskit : création de tâches et suivi.' },
    { connectorId: 'pa-docoon', description: 'Docoon (Portail d’Affaires) : facturation électronique.' },
  ];

  for (const { connectorId, description } of marketplaceConnectors) {
    const existing = await masterPrisma.marketplaceItem.findUnique({
      where: { connectorId },
    });
    if (!existing) {
      await masterPrisma.marketplaceItem.create({
        data: {
          connectorId,
          stars: 5,
          priceLabel: '99€ HT',
          description,
        },
      });
      console.log(`  Marketplace: ${connectorId}`);
    }
  }
  console.log('Exemples (EDIFACT + marketplace) appliqués.');
  await tenantPrisma.$disconnect();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => masterPrisma.$disconnect());
