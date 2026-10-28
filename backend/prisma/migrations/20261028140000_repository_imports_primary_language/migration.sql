-- AlterTable
ALTER TABLE "Repository" ADD COLUMN     "primaryLanguage" TEXT;

-- Backfill: the language with the most bytes in the stored GitHub breakdown
UPDATE "Repository" r
SET "primaryLanguage" = (
  SELECT key
  FROM jsonb_each_text(r."languages")
  ORDER BY value::bigint DESC
  LIMIT 1
)
WHERE r."languages" IS NOT NULL AND jsonb_typeof(r."languages") = 'object';

-- CreateTable
CREATE TABLE "RepositoryImport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepositoryImport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RepositoryImport_userId_idx" ON "RepositoryImport"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RepositoryImport_userId_repositoryId_key" ON "RepositoryImport"("userId", "repositoryId");

-- CreateIndex
CREATE INDEX "Repository_primaryLanguage_idx" ON "Repository"("primaryLanguage");

-- AddForeignKey
ALTER TABLE "RepositoryImport" ADD CONSTRAINT "RepositoryImport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepositoryImport" ADD CONSTRAINT "RepositoryImport_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;
