-- AlterTable
ALTER TABLE "Rep" ADD COLUMN "commissionRate" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "autoSyncMode" TEXT NOT NULL DEFAULT 'daily',
ADD COLUMN "defaultLandingPage" TEXT NOT NULL DEFAULT '/dashboard',
ADD COLUMN "leaderboardRows" INTEGER NOT NULL DEFAULT 5;
