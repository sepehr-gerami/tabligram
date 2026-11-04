-- AlterTable
ALTER TABLE "Order" ADD COLUMN "advertiserConfirmedAt" DATETIME;
ALTER TABLE "Order" ADD COLUMN "closedReason" TEXT;
ALTER TABLE "Order" ADD COLUMN "proofSubmittedAt" DATETIME;
ALTER TABLE "Order" ADD COLUMN "publishDeadlineAt" DATETIME;
ALTER TABLE "Order" ADD COLUMN "respondByAt" DATETIME;
ALTER TABLE "Order" ADD COLUMN "revealedAt" DATETIME;

-- CreateTable
CREATE TABLE "Deposit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reference" TEXT NOT NULL,
    "receiptUrl" TEXT,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectReason" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Deposit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Hold" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "advertiserId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
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
INSERT INTO "new_Campaign" ("advertiserId", "budget", "business", "category", "city", "createdAt", "description", "id", "link", "mediaKind", "mediaUrl", "minFollowers", "notes", "orderNumber", "publishAt", "publishType", "status", "targetViews", "title", "updatedAt") SELECT "advertiserId", "budget", "business", "category", "city", "createdAt", "description", "id", "link", "mediaKind", "mediaUrl", "minFollowers", "notes", "orderNumber", "publishAt", "publishType", "status", "targetViews", "title", "updatedAt" FROM "Campaign";
DROP TABLE "Campaign";
ALTER TABLE "new_Campaign" RENAME TO "Campaign";
CREATE UNIQUE INDEX "Campaign_orderNumber_key" ON "Campaign"("orderNumber");
CREATE INDEX "Campaign_advertiserId_idx" ON "Campaign"("advertiserId");
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");
CREATE TABLE "new_InstaPage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "city" TEXT,
    "bio" TEXT,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "avgStoryViews" INTEGER NOT NULL DEFAULT 0,
    "avgPostViews" INTEGER NOT NULL DEFAULT 0,
    "avgReelsViews" INTEGER NOT NULL DEFAULT 0,
    "priceStory" INTEGER NOT NULL DEFAULT 0,
    "pricePost" INTEGER NOT NULL DEFAULT 0,
    "priceReels" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectReason" TEXT,
    "avatarUrl" TEXT,
    "statsSource" TEXT NOT NULL DEFAULT 'SELF',
    "lastSyncAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InstaPage_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_InstaPage" ("avatarUrl", "avgPostViews", "avgReelsViews", "bio", "category", "city", "createdAt", "followers", "handle", "id", "lastSyncAt", "ownerId", "pricePost", "priceReels", "priceStory", "rejectReason", "statsSource", "status", "title", "updatedAt") SELECT "avatarUrl", "avgPostViews", "avgReelsViews", "bio", "category", "city", "createdAt", "followers", "handle", "id", "lastSyncAt", "ownerId", "pricePost", "priceReels", "priceStory", "rejectReason", "statsSource", "status", "title", "updatedAt" FROM "InstaPage";
DROP TABLE "InstaPage";
ALTER TABLE "new_InstaPage" RENAME TO "InstaPage";
CREATE UNIQUE INDEX "InstaPage_handle_key" ON "InstaPage"("handle");
CREATE INDEX "InstaPage_ownerId_idx" ON "InstaPage"("ownerId");
CREATE INDEX "InstaPage_status_idx" ON "InstaPage"("status");
CREATE INDEX "InstaPage_category_idx" ON "InstaPage"("category");
CREATE TABLE "new_OrderProof" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'POST_LINK',
    "proofUrl" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderProof_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_OrderProof" ("caption", "createdAt", "id", "orderId", "proofUrl") SELECT "caption", "createdAt", "id", "orderId", "proofUrl" FROM "OrderProof";
DROP TABLE "OrderProof";
ALTER TABLE "new_OrderProof" RENAME TO "OrderProof";
CREATE INDEX "OrderProof_orderId_idx" ON "OrderProof"("orderId");
CREATE TABLE "new_PublisherProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "payoutCard" TEXT,
    "payoutIban" TEXT,
    "bio" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "cardLast4" TEXT,
    "nationalIdEnc" TEXT,
    "payoutStatus" TEXT NOT NULL DEFAULT 'NONE',
    "payoutRejectReason" TEXT,
    "payoutSubmittedAt" DATETIME,
    "payoutReviewedAt" DATETIME,
    "payoutReviewedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PublisherProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PublisherProfile" ("bio", "createdAt", "id", "payoutCard", "payoutIban", "userId") SELECT "bio", "createdAt", "id", "payoutCard", "payoutIban", "userId" FROM "PublisherProfile";
DROP TABLE "PublisherProfile";
ALTER TABLE "new_PublisherProfile" RENAME TO "PublisherProfile";
CREATE UNIQUE INDEX "PublisherProfile_userId_key" ON "PublisherProfile"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Deposit_userId_status_idx" ON "Deposit"("userId", "status");

-- CreateIndex
CREATE INDEX "Deposit_status_idx" ON "Deposit"("status");

-- CreateIndex
CREATE INDEX "Deposit_reference_idx" ON "Deposit"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Hold_orderId_key" ON "Hold"("orderId");

-- CreateIndex
CREATE INDEX "Hold_advertiserId_status_idx" ON "Hold"("advertiserId", "status");

-- CreateIndex
CREATE INDEX "Hold_status_payoutDueAt_idx" ON "Hold"("status", "payoutDueAt");


-- Copy the legacy single publish type into the new list column
UPDATE "Campaign" SET "publishTypes" = "publishType" WHERE "publishTypes" = '';
