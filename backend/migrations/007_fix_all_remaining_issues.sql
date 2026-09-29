-- =============================================================================
-- Migration: Fix all remaining column issues
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. Fix notifications table - rename columns and add missing
-- =============================================================================
DO $$
BEGIN
    -- Check if is_read exists (snake_case) and rename to isRead
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notifications' AND column_name = 'is_read'
    ) THEN
        ALTER TABLE notifications RENAME COLUMN is_read TO "isRead";
    END IF;

    -- Check if created_at exists and rename to createdAt
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notifications' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE notifications RENAME COLUMN created_at TO "createdAt";
    END IF;

    -- Check if trigger_id exists and rename to triggerId
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notifications' AND column_name = 'trigger_id'
    ) THEN
        ALTER TABLE notifications RENAME COLUMN trigger_id TO "triggerId";
    END IF;

    -- Check if task_id exists and rename to taskId
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notifications' AND column_name = 'task_id'
    ) THEN
        ALTER TABLE notifications RENAME COLUMN task_id TO "taskId";
    END IF;

    -- Check if user_id exists and rename to userId
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notifications' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE notifications RENAME COLUMN user_id TO "userId";
    END IF;
END $$;

-- =============================================================================
-- 2. Fix triggers table - rename columns
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

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'triggers' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE triggers RENAME COLUMN user_id TO "userId";
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'triggers' AND column_name = 'task_id'
    ) THEN
        ALTER TABLE triggers RENAME COLUMN task_id TO "taskId";
    END IF;
END $$;

-- =============================================================================
-- 3. Make client_id nullable in tasks table (for notes/reminders without client)
-- =============================================================================
ALTER TABLE tasks ALTER COLUMN client_id DROP NOT NULL;

-- =============================================================================
-- 4. Fix spaces table - rename user_id to userId
-- =============================================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'spaces' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE spaces RENAME COLUMN user_id TO "userId";
    END IF;
END $$;

-- =============================================================================
-- 5. Fix clients table - rename space_id to spaceId
-- =============================================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'clients' AND column_name = 'space_id'
    ) THEN
        ALTER TABLE clients RENAME COLUMN space_id TO "spaceId";
    END IF;
END $$;

-- =============================================================================
-- 6. Fix projects table - rename space_id and client_id
-- =============================================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'projects' AND column_name = 'space_id'
    ) THEN
        ALTER TABLE projects RENAME COLUMN space_id TO "spaceId";
    END IF;
END $$;

COMMIT;

-- =============================================================================
-- Summary:
-- - Fixed all column names in notifications, triggers tables
-- - Made client_id nullable in tasks for notes/reminders
-- - Fixed foreign key column names in spaces, clients, projects
-- =============================================================================
