CREATE TABLE "AiInsight" (
  "id"          TEXT NOT NULL,
  "content"     TEXT NOT NULL,
  "entryCount"  INTEGER NOT NULL,
  "rangeFrom"   TIMESTAMP(3) NOT NULL,
  "rangeTo"     TIMESTAMP(3) NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiInsight_pkey" PRIMARY KEY ("id")
);
