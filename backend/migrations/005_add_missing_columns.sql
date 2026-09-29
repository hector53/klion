-- =============================================================================
-- Migration: Add all missing columns for new features
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. Add type column to tasks table
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tasks_type_enum') THEN
        CREATE TYPE tasks_type_enum AS ENUM ('task', 'note', 'reminder');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tasks' AND column_name = 'type'
    ) THEN
        ALTER TABLE tasks ADD COLUMN type tasks_type_enum DEFAULT 'task';
    END IF;
END $$;

-- =============================================================================
-- 2. Add is_archived column to spaces table (snake_case for DB)
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'spaces' AND column_name = 'is_archived'
    ) THEN
        ALTER TABLE spaces ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- =============================================================================
-- 3. Add whatsapp column to clients table
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'clients' AND column_name = 'whatsapp'
    ) THEN
        ALTER TABLE clients ADD COLUMN whatsapp VARCHAR(50);
    END IF;
END $$;

-- =============================================================================
-- 4. Create indexes for new columns
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type);
CREATE INDEX IF NOT EXISTS idx_spaces_is_archived ON spaces(is_archived);

COMMIT;

-- =============================================================================
-- Summary:
-- - Added type column to tasks (task, note, reminder)
-- - Added is_archived column to spaces
-- - Added whatsapp column to clients
-- =============================================================================
