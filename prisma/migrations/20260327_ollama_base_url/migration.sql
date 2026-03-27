-- Store Ollama base URL in AppSettings so it can be configured from the UI
-- rather than requiring a docker-compose env var.
ALTER TABLE "AppSettings" ADD COLUMN "ollamaBaseUrl" TEXT;
