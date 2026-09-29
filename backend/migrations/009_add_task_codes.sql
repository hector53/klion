-- =============================================================================
-- Migration 009: Add Jira-style task codes
-- Adds project codes (e.g., "BEB") and task numbers (e.g., 162)
-- Combined they form task codes like "BEB-162"
-- =============================================================================

BEGIN;

-- 1. Add 'code' column to projects (short uppercase identifier, e.g., "BEB")
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'projects' AND column_name = 'code'
    ) THEN
        ALTER TABLE projects ADD COLUMN code VARCHAR(10);
    END IF;
END $$;

-- 2. Add 'next_task_number' counter to projects
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'projects' AND column_name = 'next_task_number'
    ) THEN
        ALTER TABLE projects ADD COLUMN next_task_number INTEGER NOT NULL DEFAULT 1;
    END IF;
END $$;

-- 3. Add 'task_number' column to tasks
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tasks' AND column_name = 'task_number'
    ) THEN
        ALTER TABLE tasks ADD COLUMN task_number INTEGER;
    END IF;
END $$;

-- 4. Create global sequence for tasks without a project
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_sequences
        WHERE schemaname = 'public' AND sequencename = 'global_task_number_seq'
    ) THEN
        CREATE SEQUENCE global_task_number_seq START WITH 1;
    END IF;
END $$;

-- 5. Unique constraint: project code must be unique within a space
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_projects_space_code'
    ) THEN
        CREATE UNIQUE INDEX uq_projects_space_code ON projects (space_id, code)
            WHERE code IS NOT NULL;
    END IF;
END $$;

-- 6. Unique constraint: task_number must be unique within a project
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'uq_tasks_project_task_number'
    ) THEN
        CREATE UNIQUE INDEX uq_tasks_project_task_number
            ON tasks (project_id, task_number)
            WHERE project_id IS NOT NULL AND task_number IS NOT NULL;
    END IF;
END $$;

-- 7. Backfill project codes from project names
DO $$
DECLARE
    proj RECORD;
    base_code VARCHAR(10);
    final_code VARCHAR(10);
    collision_count INTEGER;
BEGIN
    FOR proj IN
        SELECT id, name, space_id FROM projects WHERE code IS NULL
        ORDER BY "createdAt" ASC
    LOOP
        -- Generate base code: first letter of each word, uppercase
        base_code := UPPER(LEFT(
            array_to_string(
                ARRAY(
                    SELECT LEFT(word, 1)
                    FROM unnest(string_to_array(regexp_replace(proj.name, '[^a-zA-Z0-9 ]', '', 'g'), ' ')) AS word
                    WHERE word != ''
                ),
                ''
            ),
            5
        ));

        -- Fallback: if name is a single short word, take first 3 chars
        IF LENGTH(base_code) < 2 THEN
            base_code := UPPER(LEFT(regexp_replace(proj.name, '[^a-zA-Z]', '', 'g'), 3));
        END IF;

        -- Ensure minimum 2 chars
        IF LENGTH(base_code) < 2 THEN
            base_code := 'PR';
        END IF;

        -- Check for collision within the same space
        final_code := base_code;
        collision_count := 0;
        WHILE EXISTS (
            SELECT 1 FROM projects
            WHERE code = final_code
            AND (space_id = proj.space_id OR (space_id IS NULL AND proj.space_id IS NULL))
            AND id != proj.id
        ) LOOP
            collision_count := collision_count + 1;
            final_code := base_code || collision_count::text;
        END LOOP;

        UPDATE projects SET code = final_code WHERE id = proj.id;
    END LOOP;
END $$;

-- 8. Backfill task numbers for existing tasks
DO $$
DECLARE
    proj RECORD;
    t RECORD;
    counter INTEGER;
BEGIN
    -- For tasks WITH a project: assign sequential numbers per project
    FOR proj IN SELECT id FROM projects ORDER BY "createdAt" ASC
    LOOP
        counter := 1;
        FOR t IN
            SELECT id FROM tasks
            WHERE project_id = proj.id AND task_number IS NULL
            ORDER BY "createdAt" ASC
        LOOP
            UPDATE tasks SET task_number = counter WHERE id = t.id;
            counter := counter + 1;
        END LOOP;
        -- Update project's next_task_number
        UPDATE projects SET next_task_number = counter WHERE id = proj.id;
    END LOOP;

    -- For tasks WITHOUT a project: assign from global sequence
    FOR t IN
        SELECT id FROM tasks
        WHERE project_id IS NULL AND task_number IS NULL
        ORDER BY "createdAt" ASC
    LOOP
        UPDATE tasks SET task_number = nextval('global_task_number_seq') WHERE id = t.id;
    END LOOP;
END $$;

-- 9. Make task_number NOT NULL after backfill (if all tasks have numbers)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM tasks WHERE task_number IS NULL) THEN
        ALTER TABLE tasks ALTER COLUMN task_number SET NOT NULL;
    END IF;
END $$;

COMMIT;
