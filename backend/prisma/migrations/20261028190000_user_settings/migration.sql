-- AlterTable
ALTER TABLE "User" ADD COLUMN     "profileShowScores" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "profileShowCalendar" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "experienceLevel" TEXT NOT NULL DEFAULT 'first',
ADD COLUMN     "preferredLanguages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "excludedLanguages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "feedView" TEXT NOT NULL DEFAULT 'grid';
