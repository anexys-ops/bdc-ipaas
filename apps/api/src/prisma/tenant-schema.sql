-- Schéma tenant (équivalent prisma db push pour tenant.prisma)
CREATE TYPE "TriggerType" AS ENUM ('CRON', 'WEBHOOK', 'MANUAL', 'FILE_WATCH', 'AGENT_WATCH');
CREATE TYPE "Environment" AS ENUM ('STAGING', 'PRODUCTION');
CREATE TYPE "DestinationWriteMode" AS ENUM ('CREATE', 'UPDATE');
CREATE TYPE "ExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED', 'DRY_RUN_OK');
CREATE TYPE "LogLevel" AS ENUM ('INFO', 'WARN', 'ERROR');

CREATE TABLE "Connector" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "configHash" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastTestedAt" TIMESTAMP(3),
  "lastTestOk" BOOLEAN,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Connector_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Flow" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "sourceConnectorId" TEXT NOT NULL,
  "triggerType" "TriggerType" NOT NULL,
  "triggerConfig" JSONB NOT NULL,
  "environment" "Environment" NOT NULL DEFAULT 'STAGING',
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Flow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FlowVersion" (
  "id" TEXT NOT NULL,
  "flowId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FlowVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Mapping" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "sourceSchema" JSONB NOT NULL,
  "destinationSchema" JSONB NOT NULL,
  "rules" JSONB NOT NULL,
  "writeMode" TEXT NOT NULL DEFAULT 'CREATE',
  "matchField" TEXT,
  "filterConfig" JSONB,
  "dryRunPassed" BOOLEAN NOT NULL DEFAULT false,
  "isProduction" BOOLEAN NOT NULL DEFAULT false,
  "sourceConnectorId" TEXT,
  "sourceOperationId" TEXT,
  "destinationConnectorId" TEXT,
  "destinationOperationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Mapping_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LookupTable" (
  "id" TEXT NOT NULL,
  "mappingId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LookupTable_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FlowDestination" (
  "id" TEXT NOT NULL,
  "flowId" TEXT NOT NULL,
  "connectorId" TEXT NOT NULL,
  "mappingId" TEXT,
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "writeMode" "DestinationWriteMode" NOT NULL DEFAULT 'CREATE',
  "searchFields" JSONB,
  CONSTRAINT "FlowDestination_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FlowExecution" (
  "id" TEXT NOT NULL,
  "flowId" TEXT NOT NULL,
  "environment" "Environment" NOT NULL,
  "status" "ExecutionStatus" NOT NULL DEFAULT 'PENDING',
  "triggerSource" TEXT NOT NULL,
  "isDryRun" BOOLEAN NOT NULL DEFAULT false,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "recordsIn" INTEGER NOT NULL DEFAULT 0,
  "recordsOut" INTEGER NOT NULL DEFAULT 0,
  "recordsFailed" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  CONSTRAINT "FlowExecution_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExecutionLog" (
  "id" TEXT NOT NULL,
  "executionId" TEXT NOT NULL,
  "level" "LogLevel" NOT NULL,
  "message" TEXT NOT NULL,
  "recordIndex" INTEGER,
  "data" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExecutionLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentToken" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "watchPaths" JSONB NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastSeenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EdifactMessage" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "sender" TEXT NOT NULL,
  "receiver" TEXT NOT NULL,
  "rawContent" TEXT NOT NULL,
  "parsedData" JSONB,
  "reference" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'RECEIVED',
  "errorMessage" TEXT,
  CONSTRAINT "EdifactMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgentToken_tokenHash_key" ON "AgentToken"("tokenHash");

ALTER TABLE "Flow" ADD CONSTRAINT "Flow_sourceConnectorId_fkey" FOREIGN KEY ("sourceConnectorId") REFERENCES "Connector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FlowVersion" ADD CONSTRAINT "FlowVersion_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LookupTable" ADD CONSTRAINT "LookupTable_mappingId_fkey" FOREIGN KEY ("mappingId") REFERENCES "Mapping"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FlowDestination" ADD CONSTRAINT "FlowDestination_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FlowDestination" ADD CONSTRAINT "FlowDestination_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "Connector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FlowDestination" ADD CONSTRAINT "FlowDestination_mappingId_fkey" FOREIGN KEY ("mappingId") REFERENCES "Mapping"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FlowExecution" ADD CONSTRAINT "FlowExecution_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExecutionLog" ADD CONSTRAINT "ExecutionLog_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "FlowExecution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
