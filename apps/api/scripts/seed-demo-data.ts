/**
 * Seed des données démo : connecteurs (Sage, Sellsy, Taskit, Docoon, Dolibarr, Sage 100),
 * mappings cohérents et planifications.
 * Prérequis : tenant "demo" déjà créé (pnpm run prisma:seed).
 * À lancer : cd apps/api && pnpm run seed:demo
 */
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

// Charger .env : racine du monorepo, .env.production, docker/, puis apps/api
// Depuis apps/api la racine est deux niveaux au-dessus (.. / ..).
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
  // Si DATABASE_URL pointe vers postgres:5432 et qu'on n'est pas dans Docker, utiliser localhost (seed depuis l'hôte)
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && dbUrl.includes('@postgres:') && !process.env.SEED_FROM_DOCKER) {
    process.env.DATABASE_URL = dbUrl.replace('@postgres:', '@localhost:');
  }
})();
import { PrismaClient as MasterPrisma } from '../src/generated/master';

const masterPrisma = new MasterPrisma();

const DEMO_SLUG = 'demo';
const VAULT_KEY =
  process.env.VAULT_KEY ||
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

function encryptVault(plaintext: string, vaultKeyHex: string): string {
  if (vaultKeyHex.length !== 64) throw new Error('VAULT_KEY doit faire 64 caractères hex');
  const key = Buffer.from(vaultKeyHex, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

function encryptConfig(config: Record<string, unknown>): string {
  return encryptVault(JSON.stringify(config), VAULT_KEY);
}

/** Schémas source/destination simplifiés pour les mappings (clients / tiers) */
const SAGE_CLIENTS_SCHEMA = {
  type: 'object',
  properties: {
    code: { type: 'string' },
    nom: { type: 'string' },
    adresse: { type: 'string' },
    code_postal: { type: 'string' },
    ville: { type: 'string' },
    pays: { type: 'string' },
    email: { type: 'string' },
    telephone: { type: 'string' },
    siret: { type: 'string' },
    tva_intra: { type: 'string' },
  },
};

const SELLSY_CONTACT_SCHEMA = {
  type: 'object',
  properties: {
    firstName: { type: 'string' },
    lastName: { type: 'string' },
    email: { type: 'string' },
    phone: { type: 'string' },
    company: { type: 'string' },
    address: { type: 'string' },
    city: { type: 'string' },
    zipCode: { type: 'string' },
    country: { type: 'string' },
  },
};

const DOLIBARR_THIRDPARTY_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    ref: { type: 'string' },
    email: { type: 'string' },
    phone: { type: 'string' },
    address: { type: 'string' },
    zip: { type: 'string' },
    town: { type: 'string' },
    country_code: { type: 'string' },
    tva_intra: { type: 'string' },
    client: { type: 'number' },
  },
};

const TASKIT_TASK_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    status: { type: 'string' },
    dueDate: { type: 'string' },
  },
};

/** Règles : Sage clients → Sellsy contacts */
const RULES_SAGE_TO_SELLSY = [
  { destinationField: 'firstName', type: 'value' as const, value: '', defaultValue: 'Contact' },
  { destinationField: 'lastName', type: 'from' as const, sourceField: 'nom' },
  { destinationField: 'email', type: 'from' as const, sourceField: 'email' },
  { destinationField: 'phone', type: 'from' as const, sourceField: 'telephone' },
  { destinationField: 'company', type: 'from' as const, sourceField: 'nom' },
  { destinationField: 'address', type: 'from' as const, sourceField: 'adresse' },
  { destinationField: 'city', type: 'from' as const, sourceField: 'ville' },
  { destinationField: 'zipCode', type: 'from' as const, sourceField: 'code_postal' },
  { destinationField: 'country', type: 'from' as const, sourceField: 'pays' },
];

/** Règles : Sage clients → Dolibarr tiers */
const RULES_SAGE_TO_DOLIBARR = [
  { destinationField: 'name', type: 'from' as const, sourceField: 'nom' },
  { destinationField: 'ref', type: 'from' as const, sourceField: 'code' },
  { destinationField: 'email', type: 'from' as const, sourceField: 'email' },
  { destinationField: 'phone', type: 'from' as const, sourceField: 'telephone' },
  { destinationField: 'address', type: 'from' as const, sourceField: 'adresse' },
  { destinationField: 'zip', type: 'from' as const, sourceField: 'code_postal' },
  { destinationField: 'town', type: 'from' as const, sourceField: 'ville' },
  { destinationField: 'country_code', type: 'from' as const, sourceField: 'pays' },
  { destinationField: 'tva_intra', type: 'from' as const, sourceField: 'tva_intra' },
  { destinationField: 'client', type: 'value' as const, value: 1 },
];

/** Règles : Sage clients → Taskit (titre tâche = sync client) */
const RULES_SAGE_TO_TASKIT = [
  { destinationField: 'title', type: 'formula' as const, formula: 'CONCAT("Sync client: ", source.nom)' },
  { destinationField: 'description', type: 'from' as const, sourceField: 'email' },
  { destinationField: 'status', type: 'value' as const, value: 'open' },
];

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL manquante. Créez un fichier .env à la racine du projet ou dans apps/api avec DATABASE_URL (ex: postgresql://anexys:xxx@localhost:5432/anexys_master). Pour Docker, utilisez le même .env que docker-compose ou copiez docker/.env.production.example.',
    );
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
  const { PrismaClient: TenantPrisma, TriggerType, DestinationWriteMode } = require('../src/generated/tenant');
  const tenantPrisma = new TenantPrisma();

  const existingFlows = await tenantPrisma.flow.count();
  if (existingFlows > 0) {
    console.log('Des flux existent déjà dans le tenant demo. Pour réinitialiser les données démo, videz les tables (connectors, mappings, flows, etc.) puis relancez.');
    await tenantPrisma.$disconnect();
    return;
  }

  console.log('Création des connecteurs démo...');

  const connectorConfigs: Array<{ type: string; name: string; config: Record<string, unknown> }> = [
    { type: 'sage', name: 'Sage Compta', config: { agent_id: 'demo-agent', api_key: 'demo-key' } },
    { type: 'sage-100', name: 'Sage 100 (SBO)', config: { agent_id: 'demo-agent', api_key: 'demo-key' } },
    { type: 'sellsy', name: 'Sellsy CRM', config: { client_id: 'demo-client', client_secret: 'demo-secret', base_url: 'https://api.sellsy.com/v2' } },
    { type: 'taskit', name: 'Taskit', config: { base_url: 'https://api.taskit.demo', api_key: 'demo-key' } },
    { type: 'pa-docoon', name: 'Docoon (PA)', config: { base_url: 'https://demo.docoon.fr', api_key: 'demo-key' } },
    { type: 'dolibarr', name: 'Dolibarr', config: { base_url: 'https://demo.dolibarr.fr', api_key: 'DOLAPIKEY-demo' } },
  ];

  const connectorIds: Record<string, string> = {};
  for (const { type, name, config } of connectorConfigs) {
    const c = await tenantPrisma.connector.create({
      data: {
        type,
        name,
        configHash: encryptConfig(config),
      },
    });
    connectorIds[name] = c.id;
    console.log(`  Connecteur créé: ${name} (${type})`);
  }

  const sageId = connectorIds['Sage Compta'];
  const sage100Id = connectorIds['Sage 100 (SBO)'];
  const sellsyId = connectorIds['Sellsy CRM'];
  const taskitId = connectorIds['Taskit'];
  const docoonId = connectorIds['Docoon (PA)'];
  const dolibarrId = connectorIds['Dolibarr'];

  console.log('Création des mappings...');

  const mappingSageSellsy = await tenantPrisma.mapping.create({
    data: {
      name: 'Sage → Sellsy (Clients vers contacts)',
      description: 'Synchronisation des clients Sage vers les contacts Sellsy',
      sourceSchema: SAGE_CLIENTS_SCHEMA as object,
      destinationSchema: SELLSY_CONTACT_SCHEMA as object,
      rules: RULES_SAGE_TO_SELLSY as object,
      sourceConnectorId: sageId,
      sourceOperationId: 'list_clients',
      destinationConnectorId: sellsyId,
      destinationOperationId: 'list_contacts',
    },
  });

  const mappingSageDolibarr = await tenantPrisma.mapping.create({
    data: {
      name: 'Sage → Dolibarr (Tiers)',
      description: 'Synchronisation des tiers Sage vers Dolibarr',
      sourceSchema: SAGE_CLIENTS_SCHEMA as object,
      destinationSchema: DOLIBARR_THIRDPARTY_SCHEMA as object,
      rules: RULES_SAGE_TO_DOLIBARR as object,
      sourceConnectorId: sageId,
      sourceOperationId: 'list_clients',
      destinationConnectorId: dolibarrId,
      destinationOperationId: 'create_thirdparty',
    },
  });

  const mappingSageTaskit = await tenantPrisma.mapping.create({
    data: {
      name: 'Sage → Taskit (Tâches)',
      description: 'Création de tâches Taskit à partir des clients Sage',
      sourceSchema: SAGE_CLIENTS_SCHEMA as object,
      destinationSchema: TASKIT_TASK_SCHEMA as object,
      rules: RULES_SAGE_TO_TASKIT as object,
      sourceConnectorId: sageId,
      sourceOperationId: 'list_clients',
      destinationConnectorId: taskitId,
      destinationOperationId: 'create_task',
    },
  });

  const mappingSageDocoon = await tenantPrisma.mapping.create({
    data: {
      name: 'Sage → Docoon (Facturation électronique)',
      description: 'Envoi des données facturation vers la PA Docoon',
      sourceSchema: SAGE_CLIENTS_SCHEMA as object,
      destinationSchema: { type: 'object', properties: {} } as object,
      rules: [{ destinationField: 'source', type: 'value' as const, value: 'sage' }] as object,
      sourceConnectorId: sageId,
      sourceOperationId: 'list_clients',
      destinationConnectorId: docoonId,
      destinationOperationId: 'submit_invoice',
    },
  });

  const mappingSage100Dolibarr = await tenantPrisma.mapping.create({
    data: {
      name: 'Sage 100 (SBO) → Dolibarr (Tiers)',
      description: 'Synchronisation Sage 100 vers Dolibarr',
      sourceSchema: SAGE_CLIENTS_SCHEMA as object,
      destinationSchema: DOLIBARR_THIRDPARTY_SCHEMA as object,
      rules: RULES_SAGE_TO_DOLIBARR as object,
      sourceConnectorId: sage100Id,
      sourceOperationId: 'list_clients',
      destinationConnectorId: dolibarrId,
      destinationOperationId: 'create_thirdparty',
    },
  });

  console.log('  Mapping Sage → Sellsy');
  console.log('  Mapping Sage → Dolibarr');
  console.log('  Mapping Sage → Taskit');
  console.log('  Mapping Sage → Docoon');
  console.log('  Mapping Sage 100 → Dolibarr');

  console.log('Création des planifications (flux)...');

  const flow1 = await tenantPrisma.flow.create({
    data: {
      name: 'Sync clients Sage → Sellsy (quotidien)',
      description: 'Planification: Sage → Sellsy (Clients vers contacts)',
      sourceConnectorId: sageId,
      triggerType: TriggerType.CRON,
      triggerConfig: { cron: '0 2 * * *' },
    },
  });
  await tenantPrisma.flowDestination.create({
    data: {
      flowId: flow1.id,
      connectorId: sellsyId,
      mappingId: mappingSageSellsy.id,
      orderIndex: 0,
      writeMode: DestinationWriteMode.CREATE,
    },
  });
  await tenantPrisma.flowVersion.create({
    data: { flowId: flow1.id, version: 1, snapshot: {} },
  });
  console.log('  Planification: Sage → Sellsy (cron 2h)');

  const flow2 = await tenantPrisma.flow.create({
    data: {
      name: 'Sync clients Sage → Dolibarr (toutes les 6h)',
      description: 'Planification: Sage → Dolibarr (Tiers)',
      sourceConnectorId: sageId,
      triggerType: TriggerType.CRON,
      triggerConfig: { cron: '0 */6 * * *' },
    },
  });
  await tenantPrisma.flowDestination.create({
    data: {
      flowId: flow2.id,
      connectorId: dolibarrId,
      mappingId: mappingSageDolibarr.id,
      orderIndex: 0,
      writeMode: DestinationWriteMode.CREATE,
    },
  });
  await tenantPrisma.flowVersion.create({
    data: { flowId: flow2.id, version: 1, snapshot: {} },
  });
  console.log('  Planification: Sage → Dolibarr (cron 6h)');

  const flow3 = await tenantPrisma.flow.create({
    data: {
      name: 'Sage → Taskit (tâches)',
      description: 'Planification: Sage → Taskit (Tâches)',
      sourceConnectorId: sageId,
      triggerType: TriggerType.CRON,
      triggerConfig: { cron: '0 8 * * 1-5' },
    },
  });
  await tenantPrisma.flowDestination.create({
    data: {
      flowId: flow3.id,
      connectorId: taskitId,
      mappingId: mappingSageTaskit.id,
      orderIndex: 0,
      writeMode: DestinationWriteMode.CREATE,
    },
  });
  await tenantPrisma.flowVersion.create({
    data: { flowId: flow3.id, version: 1, snapshot: {} },
  });
  console.log('  Planification: Sage → Taskit (jours ouvrés 8h)');

  const flow4 = await tenantPrisma.flow.create({
    data: {
      name: 'Sage → Docoon (facturation électronique)',
      description: 'Planification: Sage → Docoon (Facturation électronique)',
      sourceConnectorId: sageId,
      triggerType: TriggerType.CRON,
      triggerConfig: { cron: '0 3 * * *' },
    },
  });
  await tenantPrisma.flowDestination.create({
    data: {
      flowId: flow4.id,
      connectorId: docoonId,
      mappingId: mappingSageDocoon.id,
      orderIndex: 0,
      writeMode: DestinationWriteMode.CREATE,
    },
  });
  await tenantPrisma.flowVersion.create({
    data: { flowId: flow4.id, version: 1, snapshot: {} },
  });
  console.log('  Planification: Sage → Docoon (cron 3h)');

  const flow5 = await tenantPrisma.flow.create({
    data: {
      name: 'Sage 100 (SBO) → Dolibarr',
      description: 'Planification: Sage 100 (SBO) → Dolibarr (Tiers)',
      sourceConnectorId: sage100Id,
      triggerType: TriggerType.CRON,
      triggerConfig: { cron: '0 4 * * *' },
    },
  });
  await tenantPrisma.flowDestination.create({
    data: {
      flowId: flow5.id,
      connectorId: dolibarrId,
      mappingId: mappingSage100Dolibarr.id,
      orderIndex: 0,
      writeMode: DestinationWriteMode.CREATE,
    },
  });
  await tenantPrisma.flowVersion.create({
    data: { flowId: flow5.id, version: 1, snapshot: {} },
  });
  console.log('  Planification: Sage 100 → Dolibarr (cron 4h)');

  console.log('Données démo créées avec succès.');
  await tenantPrisma.$disconnect();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => masterPrisma.$disconnect());
