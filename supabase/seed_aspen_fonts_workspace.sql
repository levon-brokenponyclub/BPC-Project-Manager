DO $$
DECLARE
    ws_id UUID := '8d5c5e2f-3b4e-4c73-b7c3-8aefacb3f901';
    admin_id UUID;

    setup_task UUID := gen_random_uuid();
    adobe_task UUID := gen_random_uuid();
    prod_rollout UUID := gen_random_uuid();
    dev_rollout UUID := gen_random_uuid();
    qa_task UUID := gen_random_uuid();
    signoff_task UUID := gen_random_uuid();

BEGIN

-- -------------------------------------------------------------------
-- Get admin user id
-- -------------------------------------------------------------------

SELECT id
INTO admin_id
FROM auth.users
WHERE email = 'levongravett@gmail.com'
LIMIT 1;

IF admin_id IS NULL THEN
    RAISE EXCEPTION 'User levongravett@gmail.com not found in auth.users';
END IF;

-- -------------------------------------------------------------------
-- Workspace
-- -------------------------------------------------------------------

SELECT id INTO ws_id FROM workspaces WHERE name = 'Aspen Web Fonts' LIMIT 1;

IF ws_id IS NULL THEN
    ws_id := '8d5c5e2f-3b4e-4c73-b7c3-8aefacb3f901';

    INSERT INTO workspaces (id, name)
    VALUES (ws_id, 'Aspen Web Fonts')
    ON CONFLICT (id) DO NOTHING;
END IF;

-- -------------------------------------------------------------------
-- Workspace membership
-- -------------------------------------------------------------------

INSERT INTO workspace_users (workspace_id, user_id, role)
VALUES (ws_id, admin_id, 'admin')
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- -------------------------------------------------------------------
-- Milestones with dates
-- -------------------------------------------------------------------

INSERT INTO tasks (
    id,
    workspace_id,
    title,
    description,
    status,
    priority,
    due_date,
    created_by
)
VALUES

(
    setup_task,
    ws_id,
    'Programme Setup & Governance',
    'Create governance tracker, remediation workflow, and compliance logging.',
    'Todo',
    'High',
    DATE '2026-03-18',
    admin_id
),

(
    adobe_task,
    ws_id,
    'Adobe Web Project Configuration',
    'Create Adobe Web Projects, generate kits, and define embed standard.',
    'Todo',
    'High',
    DATE '2026-03-21',
    admin_id
),

(
    prod_rollout,
    ws_id,
    'Production Remediation Rollout',
    'Remediate all production environments requiring font compliance updates.',
    'Todo',
    'High',
    DATE '2026-04-10',
    admin_id
),

(
    dev_rollout,
    ws_id,
    'Development Remediation Rollout',
    'Remediate development and staging environments.',
    'Todo',
    'Medium',
    DATE '2026-04-14',
    admin_id
),

(
    qa_task,
    ws_id,
    'QA Validation & Logging',
    'Cross-browser testing and remediation verification.',
    'Todo',
    'Medium',
    DATE '2026-04-17',
    admin_id
),

(
    signoff_task,
    ws_id,
    'Final Compliance Sign-off',
    'Final review of remediation coverage and stakeholder approval.',
    'Todo',
    'Medium',
    DATE '2026-04-21',
    admin_id
)
ON CONFLICT (workspace_id, title) DO NOTHING;

-- -------------------------------------------------------------------
-- High Risk Font Tasks
-- -------------------------------------------------------------------

INSERT INTO tasks (
    id,
    workspace_id,
    parent_task_id,
    title,
    status,
    priority,
    due_date,
    created_by
)
VALUES
(gen_random_uuid(), ws_id, setup_task, 'High Risk Font – Gilroy', 'Todo', 'High', DATE '2026-03-18', admin_id),
(gen_random_uuid(), ws_id, setup_task, 'High Risk Font – Graphik', 'Todo', 'High', DATE '2026-03-18', admin_id),
(gen_random_uuid(), ws_id, setup_task, 'High Risk Font – SF Pro', 'Todo', 'High', DATE '2026-03-18', admin_id),
(gen_random_uuid(), ws_id, setup_task, 'High Risk Font – KG How Many Times', 'Todo', 'High', DATE '2026-03-18', admin_id),
(gen_random_uuid(), ws_id, setup_task, 'High Risk Font – Oh Livey', 'Todo', 'High', DATE '2026-03-18', admin_id),
(gen_random_uuid(), ws_id, setup_task, 'High Risk Font – Liberation Sans', 'Todo', 'High', DATE '2026-03-18', admin_id),
(gen_random_uuid(), ws_id, setup_task, 'High Risk Font – Bodoni ITC', 'Todo', 'High', DATE '2026-03-18', admin_id)
ON CONFLICT (workspace_id, title) DO NOTHING;

-- -------------------------------------------------------------------
-- Rollout Templates
-- -------------------------------------------------------------------

INSERT INTO tasks (
    id,
    workspace_id,
    parent_task_id,
    title,
    description,
    status,
    priority,
    due_date,
    created_by
)
VALUES

(
    gen_random_uuid(),
    ws_id,
    prod_rollout,
    'Production Site Remediation Template',
    'Create Adobe Web Project, install embed code, replace fonts, purge cache, QA validation.',
    'Todo',
    'High',
    DATE '2026-04-10',
    admin_id
),

(
    gen_random_uuid(),
    ws_id,
    dev_rollout,
    'Development Site Remediation Template',
    'Create Adobe Web Project, install embed code, replace fonts, purge cache, QA validation.',
    'Todo',
    'Medium',
    DATE '2026-04-14',
    admin_id
)
ON CONFLICT (workspace_id, title) DO NOTHING;

END $$;