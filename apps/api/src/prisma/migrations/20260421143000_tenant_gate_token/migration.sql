-- AlterTable: jeton d'entrée gateway par tenant (BDC-95)
ALTER TABLE "Tenant" ADD COLUMN "gateToken" TEXT;

UPDATE "Tenant"
SET "gateToken" = regexp_replace(lower(slug), '[^a-z0-9_-]', '_', 'g') || '_' || substring(md5(random()::text || id::text) from 1 for 8)
WHERE "gateToken" IS NULL;

ALTER TABLE "Tenant" ALTER COLUMN "gateToken" SET NOT NULL;

CREATE UNIQUE INDEX "Tenant_gateToken_key" ON "Tenant"("gateToken");
