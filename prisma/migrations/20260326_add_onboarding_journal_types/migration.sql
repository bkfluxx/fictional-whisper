-- Add journal type to entries
ALTER TABLE "Entry" ADD COLUMN "journalType" TEXT;
CREATE INDEX "Entry_journalType_idx" ON "Entry"("journalType");

-- Add onboarding fields to app settings
ALTER TABLE "AppSettings" ADD COLUMN "onboardingDone" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AppSettings" ADD COLUMN "journalTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
