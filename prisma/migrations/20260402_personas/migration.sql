-- Persona: user-created AI personas (built-ins are defined in code)
CREATE TABLE "Persona" (
    "id"           TEXT NOT NULL,
    "name"         TEXT NOT NULL,
    "description"  TEXT,
    "systemPrompt" TEXT NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Persona_pkey" PRIMARY KEY ("id")
);

-- AppSettings: personas feature toggle and active persona pointer
ALTER TABLE "AppSettings"
    ADD COLUMN IF NOT EXISTS "personasEnabled" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "activePersonaId"  TEXT;
