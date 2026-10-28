-- AlterTable
ALTER TABLE "Repository" ADD COLUMN     "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "interestAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "onboardedAt" TIMESTAMP(3),
ADD COLUMN     "rankingTuning" JSONB;

-- CreateTable
CREATE TABLE "RecommendationEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "surface" TEXT NOT NULL,
    "repositoryId" TEXT,
    "issueUrl" TEXT,
    "position" INTEGER,
    "explore" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecommendationEvent_userId_createdAt_idx" ON "RecommendationEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RecommendationEvent_type_createdAt_idx" ON "RecommendationEvent"("type", "createdAt");

-- AddForeignKey
ALTER TABLE "RecommendationEvent" ADD CONSTRAINT "RecommendationEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
