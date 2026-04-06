CREATE TABLE "Goal" (
    "id"         TEXT NOT NULL,
    "title"      TEXT NOT NULL,
    "notes"      TEXT,
    "status"     TEXT NOT NULL DEFAULT 'active',
    "targetDate" TIMESTAMP(3),
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Goal_status_idx" ON "Goal"("status");
