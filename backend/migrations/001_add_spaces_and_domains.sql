-- =============================================================================
-- Migration: Add Spaces, Domains, and Metadata for Akela
-- =============================================================================
-- This migration introduces the Spaces concept to separate work from personal life,
-- adds domain categorization to projects, and flexible metadata to tasks.
-- =============================================================================

-- Start transaction
BEGIN;

-- =============================================================================
-- 1. Create spaces table
-- =============================================================================
CREATE TABLE IF NOT EXISTS spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'personal' CHECK (type IN ('personal', 'work')),
    icon VARCHAR(50),
    color VARCHAR(7) DEFAULT '#3B82F6',
    position INT DEFAULT 0,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster queries by user
CREATE INDEX IF NOT EXISTS idx_spaces_user_id ON spaces(user_id);
CREATE INDEX IF NOT EXISTS idx_spaces_user_type ON spaces(user_id, type);

-- =============================================================================
-- 2. Add space_id to clients table
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'clients' AND column_name = 'space_id'
    ) THEN
        ALTER TABLE clients ADD COLUMN space_id UUID REFERENCES spaces(id) ON DELETE SET NULL;
    END IF;
END $$;

-- =============================================================================
-- 3. Add new columns to clients table (phone, address, metadata)
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'clients' AND column_name = 'phone'
    ) THEN
        ALTER TABLE clients ADD COLUMN phone VARCHAR(50);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'clients' AND column_name = 'address'
    ) THEN
        ALTER TABLE clients ADD COLUMN address TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'clients' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE clients ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- =============================================================================
-- 4. Add space_id, domain, icon, and metadata to projects table
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'projects' AND column_name = 'space_id'
    ) THEN
        ALTER TABLE projects ADD COLUMN space_id UUID REFERENCES spaces(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'projects' AND column_name = 'domain'
    ) THEN
        ALTER TABLE projects ADD COLUMN domain VARCHAR(50) DEFAULT 'work'
            CHECK (domain IN ('work', 'auto', 'health', 'home', 'finance', 'personal'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'projects' AND column_name = 'icon'
    ) THEN
        ALTER TABLE projects ADD COLUMN icon VARCHAR(50);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'projects' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE projects ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- Make client_id nullable in projects (for projects without a client)
ALTER TABLE projects ALTER COLUMN client_id DROP NOT NULL;

-- =============================================================================
-- 5. Add metadata to tasks table
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tasks' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE tasks ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- =============================================================================
-- 6. Create indexes for new columns
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_clients_space_id ON clients(space_id);
CREATE INDEX IF NOT EXISTS idx_projects_space_id ON projects(space_id);
CREATE INDEX IF NOT EXISTS idx_projects_domain ON projects(domain);
CREATE INDEX IF NOT EXISTS idx_tasks_metadata ON tasks USING GIN(metadata);

-- =============================================================================
-- 7. Migrate existing data - Create default "Trabajo" space and assign all data
-- =============================================================================
DO $$
DECLARE
    v_user_id UUID;
    v_work_space_id UUID;
BEGIN
    -- For each user, create default spaces and migrate data
    FOR v_user_id IN SELECT DISTINCT id FROM users
    LOOP
        -- Create "Trabajo" space
        INSERT INTO spaces (user_id, name, type, icon, color, position)
        VALUES (v_user_id, 'Trabajo', 'work', '💼', '#3B82F6', 1)
        RETURNING id INTO v_work_space_id;

        -- Create "Personal" space
        INSERT INTO spaces (user_id, name, type, icon, color, position)
        VALUES (v_user_id, 'Personal', 'personal', '🏠', '#10B981', 0);

        -- Assign all existing clients to the work space
        UPDATE clients
        SET space_id = v_work_space_id
        WHERE space_id IS NULL;

        -- Assign all existing projects to the work space
        UPDATE projects
        SET space_id = v_work_space_id, domain = 'work'
        WHERE space_id IS NULL;

        RAISE NOTICE 'Migrated data for user %', v_user_id;
    END LOOP;
END $$;

-- =============================================================================
-- 8. Add comments for documentation
-- =============================================================================
COMMENT ON TABLE spaces IS 'Spaces separate different contexts of life (Personal vs Work) in Akela';
COMMENT ON COLUMN spaces.type IS 'personal: No clients, projects are "Áreas". work: Has clients section.';
COMMENT ON COLUMN projects.domain IS 'Category: work, auto, health, home, finance, personal';
COMMENT ON COLUMN tasks.metadata IS 'Flexible JSONB for domain-specific data (km, doctor, amount, etc.)';

COMMIT;

-- =============================================================================
-- Summary of changes:
-- - Created spaces table with user_id, name, type (personal/work), icon, color
-- - Added space_id to clients and projects
-- - Added domain enum to projects (work, auto, health, home, finance, personal)
-- - Added icon and metadata (JSONB) to projects
-- - Added metadata (JSONB) to tasks for flexible domain-specific data
-- - Made client_id nullable in projects (projects can exist without a client)
-- - Created default "Personal" and "Trabajo" spaces for existing users
-- - Migrated all existing clients and projects to the "Trabajo" space
-- =============================================================================
