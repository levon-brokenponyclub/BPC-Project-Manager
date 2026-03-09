begin;

alter table if exists public.tasks
  add column if not exists parent_task_id uuid null;

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
end $$;

create index if not exists idx_tasks_parent_task_id
  on public.tasks (parent_task_id);

create index if not exists idx_tasks_workspace_parent_updated
  on public.tasks (workspace_id, parent_task_id, updated_at desc);

commit;
