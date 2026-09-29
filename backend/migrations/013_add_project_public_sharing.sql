-- =============================================================================
-- Migration 013: Add public sharing token to projects (CBK-87)
-- Backs the read-only client-facing view at /public/*, which replaces the old
-- behaviour of exposing the internal project UUID through unauthenticated
-- /tasks and /projects endpoints.
-- Mirrors entity: backend/src/modules/projects/entities/project.entity.ts
-- =============================================================================

BEGIN;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS public_share_token VARCHAR(64),
  ADD COLUMN IF NOT EXISTS public_sharing_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Unique so a token always resolves to at most one project.
CREATE UNIQUE INDEX IF NOT EXISTS "IDX_projects_public_share_token"
  ON projects(public_share_token)
  WHERE public_share_token IS NOT NULL;

COMMENT ON COLUMN projects.public_share_token IS 'Random secret for the read-only public link; regenerating it invalidates the old link';
COMMENT ON COLUMN projects.public_sharing_enabled IS 'When false, /public/* returns 404 for this project even with a valid token';

COMMIT;
