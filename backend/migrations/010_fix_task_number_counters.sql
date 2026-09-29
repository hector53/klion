-- =============================================================================
-- Migration 010: Fix out-of-sync next_task_number counters
-- The next_task_number on projects got out of sync with actual task numbers,
-- causing "duplicate key value violates unique constraint uq_tasks_project_task_number"
-- =============================================================================

BEGIN;

-- Resync next_task_number for all projects to MAX(task_number) + 1
UPDATE projects p
SET next_task_number = COALESCE(
    (SELECT MAX(t.task_number) + 1 FROM tasks t WHERE t.project_id = p.id),
    1
);

-- Also resync the global sequence for orphan tasks (no project)
SELECT setval(
    'global_task_number_seq',
    GREATEST(
        (SELECT COALESCE(MAX(task_number), 0) FROM tasks WHERE project_id IS NULL),
        (SELECT last_value FROM global_task_number_seq)
    )
);

COMMIT;
