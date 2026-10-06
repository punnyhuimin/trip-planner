-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "destination" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "phase" TEXT NOT NULL DEFAULT 'PLANNING',
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "isHost" BOOLEAN NOT NULL DEFAULT false,
    "token" TEXT NOT NULL,
    CONSTRAINT "Member_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Wish" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "kind" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "timeOfDay" TEXT NOT NULL DEFAULT 'ANY',
    "durationHrs" REAL NOT NULL DEFAULT 2,
    "costLevel" INTEGER NOT NULL DEFAULT 1,
    "energy" INTEGER NOT NULL DEFAULT 1,
    "tags" TEXT NOT NULL DEFAULT '',
    "done" BOOLEAN NOT NULL DEFAULT false,
    "memory" TEXT,
    "photoUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Wish_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Wish_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Reaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wishId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "Reaction_wishId_fkey" FOREIGN KEY ("wishId") REFERENCES "Wish" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Reaction_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlanSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "wishId" TEXT NOT NULL,
    "dayIndex" INTEGER NOT NULL,
    "timeOfDay" TEXT NOT NULL,
    "track" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "PlanSlot_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlanSlot_wishId_fkey" FOREIGN KEY ("wishId") REFERENCES "Wish" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Trip_code_key" ON "Trip"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Member_token_key" ON "Member"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Member_tripId_name_key" ON "Member"("tripId", "name");

-- CreateIndex
CREATE INDEX "Wish_tripId_idx" ON "Wish"("tripId");

-- CreateIndex
CREATE INDEX "Reaction_wishId_idx" ON "Reaction"("wishId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_wishId_memberId_key" ON "Reaction"("wishId", "memberId");

-- CreateIndex
CREATE INDEX "PlanSlot_tripId_idx" ON "PlanSlot"("tripId");
