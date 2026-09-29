-- =============================================================================
-- Migration: Fix column names to match TypeORM entity definitions (camelCase)
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. Fix spaces table column names
-- =============================================================================
DO $$
BEGIN
    -- Rename is_archived to isArchived if exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'spaces' AND column_name = 'is_archived'
    ) THEN
        ALTER TABLE spaces RENAME COLUMN is_archived TO "isArchived";
    END IF;

    -- Rename created_at to createdAt if exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'spaces' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE spaces RENAME COLUMN created_at TO "createdAt";
    END IF;

    -- Rename updated_at to updatedAt if exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'spaces' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE spaces RENAME COLUMN updated_at TO "updatedAt";
    END IF;
END $$;

-- =============================================================================
-- 2. Fix triggers table column names
-- =============================================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'triggers' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE triggers RENAME COLUMN is_active TO "isActive";
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'triggers' AND column_name = 'last_triggered_at'
    ) THEN
        ALTER TABLE triggers RENAME COLUMN last_triggered_at TO "lastTriggeredAt";
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'triggers' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE triggers RENAME COLUMN created_at TO "createdAt";
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'triggers' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE triggers RENAME COLUMN updated_at TO "updatedAt";
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'triggers' AND column_name = 'action_config'
    ) THEN
        ALTER TABLE triggers RENAME COLUMN action_config TO "actionConfig";
    END IF;
END $$;

-- =============================================================================
-- 3. Fix notifications table column names
-- =============================================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notifications' AND column_name = 'is_read'
    ) THEN
        ALTER TABLE notifications RENAME COLUMN is_read TO "isRead";
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notifications' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE notifications RENAME COLUMN created_at TO "createdAt";
    END IF;
END $$;

COMMIT;

-- =============================================================================
-- Summary:
-- - Renamed snake_case columns to camelCase to match TypeORM entities
-- =============================================================================
