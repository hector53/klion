-- =============================================================================
-- Migration: Add Notifications and Triggers tables
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. Create triggers table
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'triggers_type_enum') THEN
        CREATE TYPE triggers_type_enum AS ENUM ('time', 'recurring', 'condition');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'triggers_action_enum') THEN
        CREATE TYPE triggers_action_enum AS ENUM ('notify', 'create_task');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type triggers_type_enum DEFAULT 'time',
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    condition JSONB DEFAULT '{}',
    action triggers_action_enum DEFAULT 'notify',
    action_config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_triggers_user_id ON triggers(user_id);
CREATE INDEX IF NOT EXISTS idx_triggers_task_id ON triggers(task_id);
CREATE INDEX IF NOT EXISTS idx_triggers_is_active ON triggers(is_active);

-- =============================================================================
-- 2. Create notifications table
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notifications_type_enum') THEN
        CREATE TYPE notifications_type_enum AS ENUM ('trigger', 'system');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type notifications_type_enum DEFAULT 'trigger',
    is_read BOOLEAN DEFAULT FALSE,
    trigger_id UUID,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_task_id ON notifications(task_id);

COMMIT;

-- =============================================================================
-- Summary:
-- - Created triggers table for time-based and condition-based automations
-- - Created notifications table for user notifications
-- =============================================================================
