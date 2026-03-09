-- Add subtask support by introducing parent_task_id on tasks.
alter table if exists public.tasks
  add column if not exists parent_task_id uuid null;

-- Self-referencing foreign key for parent/child task relationships.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tasks_parent_task_id_fkey'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
      add constraint tasks_parent_task_id_fkey
      foreign key (parent_task_id)
      references public.tasks(id)
      on delete cascade;
  end if;
end
$$;

-- Speed up parent -> subtasks lookups.
create index if not exists idx_tasks_parent_task_id
  on public.tasks(parent_task_id)
  where parent_task_id is not null;
