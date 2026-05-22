ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "ollamaModelCapabilities" TEXT[] NOT NULL DEFAULT '{}';
