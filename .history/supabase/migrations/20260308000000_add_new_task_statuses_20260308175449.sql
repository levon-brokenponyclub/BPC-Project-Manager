-- Migration: Add new task statuses (On Hold, Awaiting Client, Upcoming)
-- Date: 2026-03-08

-- Step 1: Drop the existing CHECK constraint on the status column
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- Step 2: Add the new CHECK constraint with expanded status values
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status = ANY (ARRAY[
    'Todo'::text,
    'Upcoming'::text,
    'In Progress'::text,
    'In Review'::text,
    'Awaiting Client'::text,
    'On Hold'::text,
    'Complete'::text
  ]));

-- Optional: Add index on status for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);

-- Optional: Add index on status + workspace_id for workspace-filtered queries
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_status ON public.tasks(workspace_id, status);
