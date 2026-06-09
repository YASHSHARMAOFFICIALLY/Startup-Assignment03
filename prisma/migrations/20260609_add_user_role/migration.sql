-- AlterTable
ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'user';

-- Set existing users as manager (first user is always manager)
UPDATE "User" SET "role" = 'manager' WHERE "createdAt" = (SELECT MIN("createdAt") FROM "User");
