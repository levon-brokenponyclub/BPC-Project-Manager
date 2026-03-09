-- Admin bootstrap seed for Broken Pony Club – Internal workspace
-- Safe to run multiple times (idempotent)

-- Create workspace if not exists
insert into workspaces (id, name, created_at)
select 'bpc-internal-uuid', 'Broken Pony Club – Internal', now()
where not exists (select 1 from workspaces where id = 'bpc-internal-uuid');

-- Ensure admin user exists (levongravett@gmail.com)
insert into workspace_users (workspace_id, user_id, role)
select 'bpc-internal-uuid', '71873caf-a69c-43be-abe5-79be4a83566e', 'admin'
where not exists (
  select 1 from workspace_users where workspace_id = 'bpc-internal-uuid' and user_id = '71873caf-a69c-43be-abe5-79be4a83566e'
);

-- Optionally seed support bucket for current month
insert into support_buckets (id, workspace_id, period_start, period_end, hours_allocated, hours_used_cached)
select 'bucket-2026-03', 'bpc-internal-uuid', date_trunc('month', now()), date_trunc('month', now()) + interval '1 month' - interval '1 day', 20, 0
where not exists (
  select 1 from support_buckets where id = 'bucket-2026-03'
);

-- Optionally seed 2–3 tasks
insert into tasks (id, workspace_id, title, description, status, created_by, created_at)
select 'task-1', 'bpc-internal-uuid', 'Welcome Task', 'Initial setup', 'todo', '71873caf-a69c-43be-abe5-79be4a83566e', now()
where not exists (select 1 from tasks where id = 'task-1');

insert into tasks (id, workspace_id, title, description, status, created_by, created_at)
select 'task-2', 'bpc-internal-uuid', 'Demo Task', 'Demo onboarding', 'inprogress', '71873caf-a69c-43be-abe5-79be4a83566e', now()
where not exists (select 1 from tasks where id = 'task-2');
