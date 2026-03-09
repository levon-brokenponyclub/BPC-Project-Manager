-- V1 signup behavior: assign every newly created auth user to all workspaces as a client.

create or replace function public.assign_new_user_to_all_workspaces()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.workspace_users (workspace_id, user_id, role)
  select w.id, new.id, 'client'
  from public.workspaces w
  on conflict (workspace_id, user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_assign_all_workspaces on auth.users;

create trigger on_auth_user_created_assign_all_workspaces
after insert on auth.users
for each row
execute function public.assign_new_user_to_all_workspaces();
