-- Enable pgvector extension for vector similarity search
-- This runs automatically when the PostgreSQL container starts for the first time

CREATE EXTENSION IF NOT EXISTS vector;

-- Verify the extension is installed
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        RAISE NOTICE 'pgvector extension installed successfully';
    ELSE
        RAISE EXCEPTION 'pgvector extension failed to install';
    END IF;
END $$;
