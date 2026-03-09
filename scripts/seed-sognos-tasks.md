# Seeding Tasks & Subtasks into the Sognos Workspace

## Overview

Tasks are stored in the `public.tasks` table. Subtasks are regular task rows with a `parent_task_id` that references another task in the same workspace. The migration `20260308000001_add_subtasks.sql` added this column.

---

## Method 1 — Supabase Dashboard SQL Editor (Recommended for production)

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard) → select your project → **SQL Editor**
2. Paste and run the query below in sections (Step A first, then Step B).

---

### Step A — Find your Workspace ID and User ID

Run this to look up the Sognos workspace ID and confirm your user ID:

```sql
-- Find the Sognos workspace
SELECT id, name FROM public.workspaces WHERE lower(name) LIKE '%sognos%';

-- Find your user ID
SELECT id, email FROM auth.users WHERE lower(email) = lower('levongravett@gmail.com');
```

Copy the two UUIDs from the results — you'll substitute them into Step B.

---

### Step B — Insert tasks and subtasks

Replace `'<WORKSPACE_ID>'` and `'<USER_ID>'` with the values from Step A.

```sql
DO $$
DECLARE
  v_workspace_id uuid := '<WORKSPACE_ID>';   -- paste Sognos workspace UUID here
  v_user_id      uuid := '<USER_ID>';        -- paste your user UUID here

  -- parent task IDs (declared so subtasks can reference them)
  task_branding    uuid;
  task_website     uuid;
  task_social      uuid;
BEGIN

  -- ─────────────────────────────────────────────
  -- 1. INSERT PARENT TASKS
  -- ─────────────────────────────────────────────

  INSERT INTO public.tasks (
    workspace_id, title, description, status, priority,
    due_date, assignee_user_id, created_by
  ) VALUES (
    v_workspace_id,
    'Brand Identity Refresh',
    'Update brand guidelines, colour palette and logo usage.',
    'In Progress', 'High',
    '2026-04-01',
    v_user_id, v_user_id
  )
  RETURNING id INTO task_branding;

  INSERT INTO public.tasks (
    workspace_id, title, description, status, priority,
    due_date, assignee_user_id, created_by
  ) VALUES (
    v_workspace_id,
    'Website Redesign',
    'Full redesign of the Sognos marketing website.',
    'Todo', 'Urgent',
    '2026-05-15',
    v_user_id, v_user_id
  )
  RETURNING id INTO task_website;

  INSERT INTO public.tasks (
    workspace_id, title, description, status, priority,
    due_date, assignee_user_id, created_by
  ) VALUES (
    v_workspace_id,
    'Social Media Content Plan',
    'Q2 content calendar across all platforms.',
    'Todo', 'Medium',
    '2026-04-10',
    v_user_id, v_user_id
  )
  RETURNING id INTO task_social;

  -- ─────────────────────────────────────────────
  -- 2. INSERT SUBTASKS  (parent_task_id is set)
  -- ─────────────────────────────────────────────

  -- Subtasks for: Brand Identity Refresh
  INSERT INTO public.tasks (
    workspace_id, parent_task_id, title, status, priority,
    due_date, assignee_user_id, created_by
  ) VALUES
    (v_workspace_id, task_branding, 'Audit existing brand assets',      'Complete',    'Medium', '2026-03-15', v_user_id, v_user_id),
    (v_workspace_id, task_branding, 'Define new colour palette',        'In Progress', 'High',   '2026-03-25', v_user_id, v_user_id),
    (v_workspace_id, task_branding, 'Redesign logo variants',           'Todo',        'High',   '2026-03-30', v_user_id, v_user_id),
    (v_workspace_id, task_branding, 'Update brand guidelines document', 'Todo',        'Medium', '2026-04-01', v_user_id, v_user_id);

  -- Subtasks for: Website Redesign
  INSERT INTO public.tasks (
    workspace_id, parent_task_id, title, status, priority,
    due_date, assignee_user_id, created_by
  ) VALUES
    (v_workspace_id, task_website, 'Wireframes — desktop & mobile',   'Todo',        'High',   '2026-04-10', v_user_id, v_user_id),
    (v_workspace_id, task_website, 'Homepage design',                  'Todo',        'Urgent', '2026-04-20', v_user_id, v_user_id),
    (v_workspace_id, task_website, 'Copywriting — all pages',          'Todo',        'Medium', '2026-04-25', v_user_id, v_user_id),
    (v_workspace_id, task_website, 'Development handoff & QA',         'Todo',        'High',   '2026-05-10', v_user_id, v_user_id);

  -- Subtasks for: Social Media Content Plan
  INSERT INTO public.tasks (
    workspace_id, parent_task_id, title, status, priority,
    due_date, assignee_user_id, created_by
  ) VALUES
    (v_workspace_id, task_social, 'Instagram — April content grid',  'In Progress', 'Medium', '2026-03-28', v_user_id, v_user_id),
    (v_workspace_id, task_social, 'LinkedIn — thought leadership posts', 'Todo',    'Low',    '2026-04-05', v_user_id, v_user_id),
    (v_workspace_id, task_social, 'Caption & hashtag templates',      'Todo',        'Low',    '2026-04-08', v_user_id, v_user_id);

  RAISE NOTICE 'Seeded 3 parent tasks and 11 subtasks into workspace %', v_workspace_id;
END
$$;
```

---

## Method 2 — SQL migration file (for local / staging)

1. Create a new file in `supabase/migrations/` following the naming convention:

   ```
   supabase/migrations/20260308200000_seed_sognos_tasks.sql
   ```

2. Paste the SQL block from Step B above into that file.

3. Apply it to your local Supabase instance:

   ```bash
   npx supabase db push
   # or
   npx supabase migration up
   ```

> **Note:** The existing pattern in `20260305034056_seed_tasks_prod_20260305.sql` wraps everything in `BEGIN` / `COMMIT` with a `DO $$ ... $$` block — follow the same pattern if targeting production via migration.

---

## Valid field values

| Field              | Accepted values                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------ |
| `status`           | `Todo` · `Upcoming` · `In Progress` · `In Review` · `Awaiting Client` · `On Hold` · `Complete` · `Cancelled` |
| `priority`         | `Low` · `Medium` · `High` · `Urgent`                                                                         |
| `parent_task_id`   | `NULL` = top-level task · `<uuid>` = subtask (must be a task in the same workspace)                          |
| `due_date`         | ISO date string `YYYY-MM-DD` or `NULL`                                                                       |
| `assignee_user_id` | UUID from `auth.users` or `NULL`                                                                             |
| `created_by`       | UUID from `auth.users` (required)                                                                            |

---

## Rules to follow

- **Subtasks are inserted after** all parent tasks so the RETURNING ids are available.
- **Deleting a parent task** cascades to all its subtasks automatically (`ON DELETE CASCADE`).
- **Subtasks do not appear** in the main task list — the app filters `WHERE parent_task_id IS NULL`. They only appear in the TaskDrawer subtasks section and as expanded rows in the TaskTable.
- Do **not** set `parent_task_id` on a row that also has a `parent_task_id` itself — nesting beyond one level is not supported by the current UI.
- All tasks in a subtask chain must belong to the **same `workspace_id`**.
