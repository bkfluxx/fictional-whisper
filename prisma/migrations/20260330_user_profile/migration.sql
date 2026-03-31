-- Add user profile fields to AppSettings
ALTER TABLE "AppSettings" ADD COLUMN "userName" TEXT;
ALTER TABLE "AppSettings" ADD COLUMN "journalingIntention" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "AppSettings" ADD COLUMN "writingStyle" TEXT;
