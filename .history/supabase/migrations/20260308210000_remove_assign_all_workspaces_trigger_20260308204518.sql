-- Remove V1 trigger that incorrectly assigned new users to all workspaces.
-- The invite-client Edge Function handles scoped workspace assignment.
DROP TRIGGER IF EXISTS on_auth_user_created_assign_all_workspaces ON auth.users;
DROP FUNCTION IF EXISTS public.assign_new_user_to_all_workspaces();
