-- =============================================================================
-- Migration 011: Add project_notes table
-- Per-project scratchpad note (rich text + pasted images) analyzed by AI
-- to propose tasks. Mirrors entity: backend/src/modules/projects/entities/project-note.entity.ts
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS project_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL UNIQUE,
  content TEXT NOT NULL DEFAULT '',
  "lastAnalyzedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT "FK_project_notes_project_id" FOREIGN KEY (project_id)
    REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_project_notes_project_id" ON project_notes(project_id);

-- Reuse the shared updated_at trigger function from migration 001.
-- CREATE OR REPLACE is idempotent regardless of whether 001 actually ran
-- in this environment (e.g. dev DBs bootstrapped via TypeORM synchronize
-- instead of the SQL migrations never got it).
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_project_notes_updated_at'
    ) THEN
        CREATE TRIGGER update_project_notes_updated_at
          BEFORE UPDATE ON project_notes
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

COMMENT ON TABLE project_notes IS 'Per-project scratchpad note (rich text + images) analyzed by AI to propose tasks';
COMMENT ON COLUMN project_notes.content IS 'HTML content of the note, including <img> tags pointing to /files/serve/<filename>';
COMMENT ON COLUMN project_notes."lastAnalyzedAt" IS 'Last time POST /ai/analyze-project-notes ran against this note';

COMMIT;
