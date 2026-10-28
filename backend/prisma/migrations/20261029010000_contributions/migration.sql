-- AlterTable
ALTER TABLE "RecommendationEvent" ADD COLUMN     "breakdown" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "contributionsSyncedAt" TIMESTAMP(3),
ADD COLUMN     "githubTokenInvalidAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Contribution" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "prUrl" TEXT NOT NULL,
    "prNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "repoFullName" TEXT NOT NULL,
    "repositoryId" TEXT,
    "state" TEXT NOT NULL,
    "closesIssues" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "attributed" BOOLEAN NOT NULL DEFAULT false,
    "surface" TEXT,
    "firstShownAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3) NOT NULL,
    "mergedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "learnedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecommendationEvent_userId_repositoryId_idx" ON "RecommendationEvent"("userId", "repositoryId");

-- CreateIndex
CREATE INDEX "Contribution_userId_openedAt_idx" ON "Contribution"("userId", "openedAt");

-- CreateIndex
CREATE INDEX "Contribution_attributed_openedAt_idx" ON "Contribution"("attributed", "openedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Contribution_userId_prUrl_key" ON "Contribution"("userId", "prUrl");

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
