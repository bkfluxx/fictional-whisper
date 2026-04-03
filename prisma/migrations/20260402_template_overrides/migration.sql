-- Built-in template overrides: builtinId links a JournalTemplate row to a
-- BUILT_IN_TEMPLATES code entry; hidden soft-deletes it from pickers.
ALTER TABLE "JournalTemplate"
    ADD COLUMN IF NOT EXISTS "builtinId" TEXT,
    ADD COLUMN IF NOT EXISTS "hidden"    BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "JournalTemplate_builtinId_key"
    ON "JournalTemplate"("builtinId");
