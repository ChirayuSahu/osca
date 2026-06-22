-- AlterTable
ALTER TABLE "Repository" ADD COLUMN "techStack" TEXT[] DEFAULT ARRAY[]::TEXT[];
