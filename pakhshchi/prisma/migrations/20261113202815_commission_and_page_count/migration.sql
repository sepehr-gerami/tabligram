-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" TEXT NOT NULL,
    "advertiserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "business" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "mediaKind" TEXT,
    "budget" INTEGER NOT NULL,
    "pageCount" INTEGER NOT NULL DEFAULT 1,
    "minFollowers" INTEGER,
    "targetViews" INTEGER,
    "category" TEXT,
    "city" TEXT,
    "notes" TEXT,
    "publishType" TEXT NOT NULL,
    "publishTypes" TEXT NOT NULL DEFAULT '',
    "publishAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Campaign_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Campaign" ("advertiserId", "budget", "business", "category", "city", "createdAt", "description", "id", "link", "mediaKind", "mediaUrl", "minFollowers", "notes", "orderNumber", "publishAt", "publishType", "publishTypes", "status", "targetViews", "title", "updatedAt") SELECT "advertiserId", "budget", "business", "category", "city", "createdAt", "description", "id", "link", "mediaKind", "mediaUrl", "minFollowers", "notes", "orderNumber", "publishAt", "publishType", "publishTypes", "status", "targetViews", "title", "updatedAt" FROM "Campaign";
DROP TABLE "Campaign";
ALTER TABLE "new_Campaign" RENAME TO "Campaign";
CREATE UNIQUE INDEX "Campaign_orderNumber_key" ON "Campaign"("orderNumber");
CREATE INDEX "Campaign_advertiserId_idx" ON "Campaign"("advertiserId");
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");
CREATE TABLE "new_Hold" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "advertiserId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "commissionBps" INTEGER NOT NULL DEFAULT 1000,
    "commission" INTEGER NOT NULL DEFAULT 0,
    "publisherAmount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'HELD',
    "heldAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payoutDueAt" DATETIME,
    "payoutReference" TEXT,
    "paidOutAt" DATETIME,
    "paidOutById" TEXT,
    "refundedAt" DATETIME,
    "refundReason" TEXT,
    "disputedAt" DATETIME,
    "disputeNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Hold_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Hold_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Hold" ("advertiserId", "amount", "createdAt", "disputeNote", "disputedAt", "heldAt", "id", "orderId", "paidOutAt", "paidOutById", "payoutDueAt", "payoutReference", "refundReason", "refundedAt", "status", "updatedAt") SELECT "advertiserId", "amount", "createdAt", "disputeNote", "disputedAt", "heldAt", "id", "orderId", "paidOutAt", "paidOutById", "payoutDueAt", "payoutReference", "refundReason", "refundedAt", "status", "updatedAt" FROM "Hold";
DROP TABLE "Hold";
ALTER TABLE "new_Hold" RENAME TO "Hold";
CREATE UNIQUE INDEX "Hold_orderId_key" ON "Hold"("orderId");
CREATE INDEX "Hold_advertiserId_status_idx" ON "Hold"("advertiserId", "status");
CREATE INDEX "Hold_status_payoutDueAt_idx" ON "Hold"("status", "payoutDueAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
