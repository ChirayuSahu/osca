-- AlterTable
ALTER TABLE "Repository" ADD COLUMN     "approachabilityUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "goodFirstIssueCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hasContributingGuide" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "helpWantedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pushedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Repository_goodFirstIssueCount_idx" ON "Repository"("goodFirstIssueCount");
