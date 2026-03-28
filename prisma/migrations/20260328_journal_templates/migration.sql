CREATE TABLE "JournalTemplate" (
    "id"          TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "description" TEXT,
    "emoji"       TEXT NOT NULL DEFAULT '📝',
    "body"        TEXT NOT NULL,
    "categories"  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "JournalTemplate_pkey" PRIMARY KEY ("id")
);
