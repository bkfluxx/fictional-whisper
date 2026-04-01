CREATE TABLE "WeeklyDigest" (
    "id"         TEXT NOT NULL,
    "weekStart"  TIMESTAMP(3) NOT NULL,
    "content"    TEXT NOT NULL,
    "entryCount" INTEGER NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeeklyDigest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WeeklyDigest_weekStart_idx" ON "WeeklyDigest"("weekStart");
