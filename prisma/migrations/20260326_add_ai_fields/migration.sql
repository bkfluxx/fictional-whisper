-- AI Phase 2: resize embedding vector, add summary + aiMood fields, add HNSW index.
-- All existing entries have embedding = NULL so dropping and re-adding is safe.

ALTER TABLE "Entry" DROP COLUMN IF EXISTS "embedding";
ALTER TABLE "Entry" ADD COLUMN "embedding" vector(768);

ALTER TABLE "Entry" ADD COLUMN "summary" TEXT;
ALTER TABLE "Entry" ADD COLUMN "aiMood" TEXT;

-- HNSW index for fast approximate cosine-similarity search
CREATE INDEX "Entry_embedding_hnsw_idx"
  ON "Entry" USING hnsw (embedding vector_cosine_ops);
