-- Add categories array column to Entry
ALTER TABLE "Entry" ADD COLUMN "categories" TEXT[] NOT NULL DEFAULT '{}';

-- Migrate existing journalType values into categories
UPDATE "Entry" SET "categories" = ARRAY["journalType"] WHERE "journalType" IS NOT NULL;

-- Drop the old journalType index and column
DROP INDEX IF EXISTS "Entry_journalType_idx";
ALTER TABLE "Entry" DROP COLUMN "journalType";

-- GIN index for fast array containment queries
CREATE INDEX "Entry_categories_idx" ON "Entry" USING GIN ("categories");

-- Drop the journalTypes column from AppSettings (no longer needed)
ALTER TABLE "AppSettings" DROP COLUMN IF EXISTS "journalTypes";
