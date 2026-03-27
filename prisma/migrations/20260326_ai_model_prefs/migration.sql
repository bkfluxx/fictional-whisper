-- Store user-selected Ollama model preferences in AppSettings.
-- NULL means "use the OLLAMA_MODEL / OLLAMA_EMBED_MODEL env var defaults".

ALTER TABLE "AppSettings" ADD COLUMN "ollamaModel" TEXT;
ALTER TABLE "AppSettings" ADD COLUMN "ollamaEmbedModel" TEXT;
