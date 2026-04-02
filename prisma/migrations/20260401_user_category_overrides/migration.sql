-- Add builtinId and hidden to UserCategory
ALTER TABLE "UserCategory" ADD COLUMN "builtinId" TEXT;
ALTER TABLE "UserCategory" ADD COLUMN "hidden" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX "UserCategory_builtinId_key" ON "UserCategory"("builtinId");
