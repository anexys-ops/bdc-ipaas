-- CreateTable
CREATE TABLE "MarketplaceItem" (
    "id" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL DEFAULT 5,
    "priceLabel" TEXT NOT NULL DEFAULT '99€ HT',
    "description" TEXT,
    "apiJsonPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceItem_connectorId_key" ON "MarketplaceItem"("connectorId");
