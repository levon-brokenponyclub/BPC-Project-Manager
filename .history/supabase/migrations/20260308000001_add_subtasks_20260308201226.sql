-- Add subtask support: nullable parent_task_id on the tasks table
-- A primary task has parent_task_id IS NULL
-- A subtask has parent_task_id pointing to a tasks(id) row in the same workspace

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS parent_task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE;

-- Index so listing subtasks by parent is fast
CREATE INDEX IF NOT EXISTS tasks_parent_task_id_idx
  ON public.tasks (parent_task_id)
  WHERE parent_task_id IS NOT NULL;
