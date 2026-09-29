-- =============================================================================
-- Migration: Revert column names to snake_case (TypeORM uses @JoinColumn with snake_case)
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. Revert spaces table columns
-- =============================================================================
DO $$
BEGIN
    -- Revert userId to user_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'spaces' AND column_name = 'userId'
    ) THEN
        ALTER TABLE spaces RENAME COLUMN "userId" TO user_id;
    END IF;

    -- Revert isArchived to is_archived
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'spaces' AND column_name = 'isArchived'
    ) THEN
        ALTER TABLE spaces RENAME COLUMN "isArchived" TO is_archived;
    END IF;

    -- Revert createdAt to created_at
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'spaces' AND column_name = 'createdAt'
    ) THEN
        ALTER TABLE spaces RENAME COLUMN "createdAt" TO created_at;
    END IF;

    -- Revert updatedAt to updated_at
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'spaces' AND column_name = 'updatedAt'
    ) THEN
        ALTER TABLE spaces RENAME COLUMN "updatedAt" TO updated_at;
    END IF;
END $$;

-- =============================================================================
-- 2. Revert clients table columns
-- =============================================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'clients' AND column_name = 'spaceId'
    ) THEN
        ALTER TABLE clients RENAME COLUMN "spaceId" TO space_id;
    END IF;
END $$;

-- =============================================================================
-- 3. Revert projects table columns
-- =============================================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'projects' AND column_name = 'spaceId'
    ) THEN
        ALTER TABLE projects RENAME COLUMN "spaceId" TO space_id;
    END IF;
END $$;

-- =============================================================================
-- 4. Revert notifications table columns
-- =============================================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notifications' AND column_name = 'userId'
    ) THEN
        ALTER TABLE notifications RENAME COLUMN "userId" TO user_id;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notifications' AND column_name = 'isRead'
    ) THEN
        ALTER TABLE notifications RENAME COLUMN "isRead" TO is_read;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notifications' AND column_name = 'triggerId'
    ) THEN
        ALTER TABLE notifications RENAME COLUMN "triggerId" TO trigger_id;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notifications' AND column_name = 'taskId'
    ) THEN
        ALTER TABLE notifications RENAME COLUMN "taskId" TO task_id;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notifications' AND column_name = 'createdAt'
    ) THEN
        ALTER TABLE notifications RENAME COLUMN "createdAt" TO created_at;
    END IF;
END $$;

-- =============================================================================
-- 5. Revert triggers table columns
-- =============================================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'triggers' AND column_name = 'userId'
    ) THEN
        ALTER TABLE triggers RENAME COLUMN "userId" TO user_id;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'triggers' AND column_name = 'taskId'
    ) THEN
        ALTER TABLE triggers RENAME COLUMN "taskId" TO task_id;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'triggers' AND column_name = 'isActive'
    ) THEN
        ALTER TABLE triggers RENAME COLUMN "isActive" TO is_active;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'triggers' AND column_name = 'lastTriggeredAt'
    ) THEN
        ALTER TABLE triggers RENAME COLUMN "lastTriggeredAt" TO last_triggered_at;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'triggers' AND column_name = 'actionConfig'
    ) THEN
        ALTER TABLE triggers RENAME COLUMN "actionConfig" TO action_config;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'triggers' AND column_name = 'createdAt'
    ) THEN
        ALTER TABLE triggers RENAME COLUMN "createdAt" TO created_at;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'triggers' AND column_name = 'updatedAt'
    ) THEN
        ALTER TABLE triggers RENAME COLUMN "updatedAt" TO updated_at;
    END IF;
END $$;

COMMIT;

-- =============================================================================
-- Summary:
-- - Reverted all column names back to snake_case to match TypeORM @JoinColumn definitions
-- =============================================================================
