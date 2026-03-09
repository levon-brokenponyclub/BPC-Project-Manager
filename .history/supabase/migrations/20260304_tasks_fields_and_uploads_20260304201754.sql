-- 20260304_tasks_fields_and_uploads.sql
-- Idempotent migration: task premium fields + attachments + RLS + activity logging

create extension if not exists pgcrypto with schema public;

-- A1) Upgrade public.tasks (columns)
alter table if exists public.tasks
  add column if not exists priority text not null default 'Medium',
  add column if not exists support_bucket_id uuid null references public.support_buckets(id) on delete set null,
  add column if not exists estimated_hours numeric(10,2) null,
  add column if not exists billable boolean not null default true,
  add column if not exists client_visible boolean not null default true,
  add column if not exists blocked boolean not null default false,
  add column if not exists blocked_reason text null,
  add column if not exists completed_at timestamptz null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tasks_priority_check'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
      add constraint tasks_priority_check
      check (priority in ('Low', 'Medium', 'High', 'Urgent')) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'tasks_estimated_hours_check'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
      add constraint tasks_estimated_hours_check
      check (estimated_hours is null or estimated_hours >= 0) not valid;
  end if;
end $$;

-- A2) updated_at trigger (tasks)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before update on public.tasks
for each row
execute function public.set_updated_at();

-- A3) indexes
create index if not exists idx_tasks_workspace_status
  on public.tasks (workspace_id, status);

create index if not exists idx_tasks_workspace_due_date
  on public.tasks (workspace_id, due_date);

create index if not exists idx_tasks_workspace_assignee
  on public.tasks (workspace_id, assignee_user_id);

create index if not exists idx_tasks_workspace_created_at_desc
  on public.tasks (workspace_id, created_at desc);

-- A4) Upload system
create table if not exists public.task_files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  uploader_user_id uuid not null references auth.users(id),
  storage_path text not null unique,
  file_name text not null,
  mime_type text null,
  size_bytes bigint null check (size_bytes is null or size_bytes >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_task_files_task_created_at_desc
  on public.task_files (task_id, created_at desc);

create index if not exists idx_task_files_workspace_created_at_desc
  on public.task_files (workspace_id, created_at desc);

create index if not exists idx_task_files_uploader_created_at_desc
  on public.task_files (uploader_user_id, created_at desc);

create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_users wu
    where wu.workspace_id = p_workspace_id
      and wu.user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_admin(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_users wu
    where wu.workspace_id = p_workspace_id
      and wu.user_id = auth.uid()
      and wu.role = 'admin'
  );
$$;

create or replace function public.storage_object_workspace_id(p_name text)
returns uuid
language plpgsql
immutable
as $$
declare
  parsed uuid;
begin
  begin
    parsed := split_part(p_name, '/', 1)::uuid;
  exception
    when others then
      return null;
  end;

  return parsed;
end;
$$;

alter table public.task_files enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'task_files'
      and policyname = 'task_files_select_member'
  ) then
    create policy task_files_select_member
      on public.task_files
      for select
      using (public.is_workspace_member(workspace_id));
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'task_files'
      and policyname = 'task_files_insert_member'
  ) then
    create policy task_files_insert_member
      on public.task_files
      for insert
      with check (
        public.is_workspace_member(workspace_id)
        and uploader_user_id = auth.uid()
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'task_files'
      and policyname = 'task_files_delete_owner_or_admin'
  ) then
    create policy task_files_delete_owner_or_admin
      on public.task_files
      for delete
      using (
        uploader_user_id = auth.uid()
        or public.is_workspace_admin(workspace_id)
      );
  end if;
end $$;

-- Storage bucket (private)
insert into storage.buckets (id, name, public)
values ('task-attachments', 'task-attachments', false)
on conflict (id) do update
set public = excluded.public;

-- Storage RLS policies on storage.objects
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'task_attachments_insert_member'
  ) then
    create policy task_attachments_insert_member
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'task-attachments'
        and public.storage_object_workspace_id(name) is not null
        and split_part(name, '/', 2) <> ''
        and public.is_workspace_member(public.storage_object_workspace_id(name))
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'task_attachments_select_member'
  ) then
    create policy task_attachments_select_member
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'task-attachments'
        and public.storage_object_workspace_id(name) is not null
        and public.is_workspace_member(public.storage_object_workspace_id(name))
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'task_attachments_delete_owner_or_admin'
  ) then
    create policy task_attachments_delete_owner_or_admin
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'task-attachments'
        and exists (
          select 1
          from public.task_files tf
          where tf.storage_path = name
            and (
              tf.uploader_user_id = auth.uid()
              or public.is_workspace_admin(tf.workspace_id)
            )
        )
      );
  end if;
end $$;

-- Activity logging for uploads/deletes
create or replace function public.log_task_file_uploaded()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.task_activity (task_id, type, payload, created_at)
  values (
    new.task_id,
    'file.uploaded',
    jsonb_build_object(
      'file_name', new.file_name,
      'mime_type', new.mime_type,
      'size_bytes', new.size_bytes,
      'storage_path', new.storage_path,
      'uploader_user_id', new.uploader_user_id
    ),
    now()
  );

  return new;
end;
$$;

create or replace function public.log_task_file_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.task_activity (task_id, type, payload, created_at)
  values (
    old.task_id,
    'file.deleted',
    jsonb_build_object(
      'file_name', old.file_name,
      'mime_type', old.mime_type,
      'size_bytes', old.size_bytes,
      'storage_path', old.storage_path,
      'uploader_user_id', old.uploader_user_id,
      'deleted_by', auth.uid()
    ),
    now()
  );

  return old;
end;
$$;

drop trigger if exists task_files_after_insert on public.task_files;
create trigger task_files_after_insert
after insert on public.task_files
for each row
execute function public.log_task_file_uploaded();

drop trigger if exists task_files_after_delete on public.task_files;
create trigger task_files_after_delete
after delete on public.task_files
for each row
execute function public.log_task_file_deleted();
