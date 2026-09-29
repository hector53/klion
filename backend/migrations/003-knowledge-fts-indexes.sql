-- Full-text search and optional trigram indexes for knowledge search
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Wrapper to allow indexing with unaccent (unaccent is STABLE, not IMMUTABLE)
CREATE OR REPLACE FUNCTION unaccent_immutable(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT unaccent('public.unaccent', $1);
$$;

CREATE INDEX IF NOT EXISTS knowledge_fts_idx
  ON knowledge
  USING GIN (
    to_tsvector(
      'simple',
      unaccent_immutable(
        coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(content, '')
      )
    )
  );

CREATE INDEX IF NOT EXISTS knowledge_title_trgm_idx
  ON knowledge
  USING GIN (unaccent_immutable(lower(title)) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS knowledge_summary_trgm_idx
  ON knowledge
  USING GIN (unaccent_immutable(lower(summary)) gin_trgm_ops);
