-- AlterTable
ALTER TABLE "Repository" ADD COLUMN     "outsidePrMergeRate" DOUBLE PRECISION,
ADD COLUMN     "outsidePrsMerged90d" INTEGER,
ADD COLUMN     "maintainerResponseHours" DOUBLE PRECISION,
ADD COLUMN     "unclaimedStarterIssues" INTEGER;
