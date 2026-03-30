-- Allow workspace admins to upload/update/delete avatars for any user.
-- The existing own-folder policies remain intact for self-uploads.

-- ── Insert: workspace admins can upload into any uid/ folder ─────────────────
drop policy if exists "avatars_insert_admin" on storage.objects;
create policy "avatars_insert_admin"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and exists (
    select 1 from public.workspace_users
    where workspace_users.user_id = auth.uid()
      and workspace_users.role = 'admin'
  )
);

-- ── Update: workspace admins can overwrite any avatar ────────────────────────
drop policy if exists "avatars_update_admin" on storage.objects;
create policy "avatars_update_admin"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and exists (
    select 1 from public.workspace_users
    where workspace_users.user_id = auth.uid()
      and workspace_users.role = 'admin'
  )
)
with check (
  bucket_id = 'avatars'
  and exists (
    select 1 from public.workspace_users
    where workspace_users.user_id = auth.uid()
      and workspace_users.role = 'admin'
  )
);

-- ── Delete: workspace admins can remove any avatar ───────────────────────────
drop policy if exists "avatars_delete_admin" on storage.objects;
create policy "avatars_delete_admin"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and exists (
    select 1 from public.workspace_users
    where workspace_users.user_id = auth.uid()
      and workspace_users.role = 'admin'
  )
);
