CREATE TABLE "CustomEmotion" (
  "id"        TEXT         NOT NULL,
  "label"     TEXT         NOT NULL,
  "value"     TEXT         NOT NULL,
  "groupId"   TEXT         NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomEmotion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CustomEmotion_value_key" ON "CustomEmotion"("value");
