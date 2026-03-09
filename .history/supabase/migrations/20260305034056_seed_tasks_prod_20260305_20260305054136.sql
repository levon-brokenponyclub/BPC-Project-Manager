begin;

do $$
declare
	v_user_id uuid;
	v_workspace_id uuid;
begin
	select u.id
	into v_user_id
	from auth.users u
	where lower(u.email) = lower('levongravett@gmail.com')
	limit 1;

	if v_user_id is null then
		raise exception 'Seed failed: could not find auth user for levongravett@gmail.com';
	end if;

	-- Prefer an admin workspace for seeding; fall back to any workspace membership.
	select wu.workspace_id
	into v_workspace_id
	from public.workspace_users wu
	where wu.user_id = v_user_id
		and wu.role = 'admin'
	order by wu.workspace_id
	limit 1;

	if v_workspace_id is null then
		select wu.workspace_id
		into v_workspace_id
		from public.workspace_users wu
		where wu.user_id = v_user_id
		order by wu.workspace_id
		limit 1;
	end if;

	if v_workspace_id is null then
		raise exception 'Seed failed: user % is not assigned to any workspace', v_user_id;
	end if;

	-- Delete existing task-related data in the selected workspace.
	delete from public.task_files where workspace_id = v_workspace_id;
	delete from public.comments where task_id in (select t.id from public.tasks t where t.workspace_id = v_workspace_id);
	delete from public.task_activity where task_id in (select t.id from public.tasks t where t.workspace_id = v_workspace_id);
	delete from public.time_entries where task_id in (select t.id from public.tasks t where t.workspace_id = v_workspace_id);
	delete from public.tasks where workspace_id = v_workspace_id;

	-- Seed the 12 requested tasks.
	insert into public.tasks (
		workspace_id,
		title,
		description,
		status,
		priority,
		due_date,
		assignee_user_id,
		created_by
	) values
		(v_workspace_id, 'IHS Website Registration Footer', null, 'Todo', 'Medium', '2026-02-10', v_user_id, v_user_id),
		(v_workspace_id, 'IHS & SAE Ambassador Landing Pages Copy Updates', null, 'Todo', 'Urgent', '2026-03-03', v_user_id, v_user_id),
		(v_workspace_id, 'SAE Footers - Thank You Pages', null, 'Todo', 'Medium', '2026-01-08', v_user_id, v_user_id),
		(v_workspace_id, 'Carepoint Forms - Add Anonymous Option', null, 'Todo', 'Medium', '2026-02-23', v_user_id, v_user_id),
		(v_workspace_id, 'SAE - Hide Pages', null, 'Todo', 'Medium', '2026-02-25', v_user_id, v_user_id),
		(v_workspace_id, 'SAE Part-Time Courses Updates', null, 'Todo', 'Medium', '2026-02-27', v_user_id, v_user_id),
		(v_workspace_id, 'IHS & SAE Campus Tour Videos', null, 'Todo', 'Medium', '2026-02-26', v_user_id, v_user_id),
		(v_workspace_id, 'SAE Online Postgrad Tech Info Sheet', null, 'Todo', 'Medium', '2026-02-27', v_user_id, v_user_id),
		(v_workspace_id, 'Beyond Grad - IHS Alumni Spotlight - Dylan Botes', null, 'Todo', 'Medium', '2026-03-02', v_user_id, v_user_id),
		(v_workspace_id, 'Beyond Grad IHS Alumni Spotlight - Kuhle Ongezwa Cweti', null, 'Todo', 'Medium', '2026-03-02', v_user_id, v_user_id),
		(v_workspace_id, 'IHS Higher Certificate in Culinary Skills and Patisserie Programmes Updates', null, 'Todo', 'Medium', '2026-03-04', v_user_id, v_user_id),
		(v_workspace_id, 'IHS Fees Schedule - Update', null, 'Todo', 'Medium', '2026-03-04', v_user_id, v_user_id);
end
$$;

commit;

