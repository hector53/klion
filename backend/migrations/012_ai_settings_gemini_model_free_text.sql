-- =============================================================================
-- Migration 012: ai_settings — free-text Gemini model, drop per-user API keys
-- - "geminiDefaultModel" moves from a fixed Postgres enum to VARCHAR, since
--   Google adds/retires Gemini model ids over time (gemini-2.0-flash was
--   retired mid-2026) and a hardcoded enum can't track that. The backend now
--   validates available models live via GET /ai/models (GeminiService.listModels()).
-- - "openaiApiKey"/"geminiApiKey" are dropped: the product runs single-user
--   and API keys are configured exclusively via OPENAI_API_KEY/GEMINI_API_KEY
--   in .env, not per-user in the DB.
-- =============================================================================

BEGIN;

-- 1. geminiDefaultModel: enum -> varchar(100)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ai_settings'
          AND column_name = 'geminiDefaultModel'
          AND data_type <> 'character varying'
    ) THEN
        ALTER TABLE ai_settings
          ALTER COLUMN "geminiDefaultModel" TYPE VARCHAR(100)
          USING "geminiDefaultModel"::text;
    END IF;

    ALTER TABLE ai_settings
      ALTER COLUMN "geminiDefaultModel" SET DEFAULT 'gemini-2.5-flash';
END $$;

-- Drop the old enum type(s), whichever name this environment ended up with
-- (TypeORM's auto-sync convention vs. the hand-written 001 migration's name).
DROP TYPE IF EXISTS ai_settings_geminidefaultmodel_enum;
DROP TYPE IF EXISTS gemini_model;

-- 2. Drop per-user API key columns (env-only now, see AGENTS.md)
ALTER TABLE ai_settings DROP COLUMN IF EXISTS "openaiApiKey";
ALTER TABLE ai_settings DROP COLUMN IF EXISTS "geminiApiKey";

COMMIT;
