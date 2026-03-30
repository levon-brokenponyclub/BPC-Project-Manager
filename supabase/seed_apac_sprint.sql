-- ============================================================
-- APAC Web Fonts Compliance Remediation Sprint
-- Workspace: afb5f905-44ce-4556-a54b-2aba78362989
-- 6 workstreams + 52 site tasks (36 prod / 16 dev)
-- Sprint: 2026-03-31 → 2026-04-14 (11 working days)
-- Run: psql or Supabase SQL editor — fully idempotent
-- ============================================================

DO $$
DECLARE
  ws_id           UUID := 'afb5f905-44ce-4556-a54b-2aba78362989';
  admin_id        UUID;
  apac_project_id UUID;

  ws_setup        UUID;
  ws_adobe        UUID;
  ws_prod         UUID;
  ws_dev          UUID;
  ws_qa           UUID;
  ws_tracking     UUID;

BEGIN

  -- ─── Admin user ───────────────────────────────────────────────────────────

  SELECT id INTO admin_id
  FROM auth.users
  WHERE email = 'levongravett@gmail.com'
  LIMIT 1;

  IF admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin user levongravett@gmail.com not found';
  END IF;

  -- ─── APAC project ─────────────────────────────────────────────────────────

  SELECT id INTO apac_project_id
  FROM projects
  WHERE workspace_id = ws_id AND name ILIKE '%APAC%'
  LIMIT 1;

  IF apac_project_id IS NULL THEN
    RAISE EXCEPTION 'APAC project not found in workspace %', ws_id;
  END IF;

  -- ─── Workstreams (upsert by workspace+title, then assign to APAC project) ──
  -- The unique constraint is on (workspace_id, title), not project_id.
  -- We insert on conflict do nothing, then always re-select the id.

  INSERT INTO tasks (workspace_id, project_id, title, description, status, priority, due_date, created_by)
  VALUES
    (ws_id, apac_project_id, 'Programme Setup & Governance',    '{"workstream":true,"sprint":"APAC Web Fonts Remediation"}', 'Todo', 'High',   '2026-04-02', admin_id),
    (ws_id, apac_project_id, 'Adobe Web Project Configuration', '{"workstream":true,"sprint":"APAC Web Fonts Remediation"}', 'Todo', 'High',   '2026-04-02', admin_id),
    (ws_id, apac_project_id, 'Production Remediation Rollout',  '{"workstream":true,"sprint":"APAC Web Fonts Remediation"}', 'Todo', 'High',   '2026-04-09', admin_id),
    (ws_id, apac_project_id, 'Development Remediation Rollout', '{"workstream":true,"sprint":"APAC Web Fonts Remediation"}', 'Todo', 'Medium', '2026-04-14', admin_id),
    (ws_id, apac_project_id, 'QA & Validation',                 '{"workstream":true,"sprint":"APAC Web Fonts Remediation"}', 'Todo', 'Medium', '2026-04-14', admin_id),
    (ws_id, apac_project_id, 'Tracking, Logging & Close-out',   '{"workstream":true,"sprint":"APAC Web Fonts Remediation"}', 'Todo', 'Medium', '2026-04-14', admin_id)
  ON CONFLICT (workspace_id, title) DO UPDATE
    SET project_id = EXCLUDED.project_id;

  SELECT id INTO ws_setup    FROM tasks WHERE workspace_id = ws_id AND title = 'Programme Setup & Governance'    LIMIT 1;
  SELECT id INTO ws_adobe    FROM tasks WHERE workspace_id = ws_id AND title = 'Adobe Web Project Configuration' LIMIT 1;
  SELECT id INTO ws_prod     FROM tasks WHERE workspace_id = ws_id AND title = 'Production Remediation Rollout'  LIMIT 1;
  SELECT id INTO ws_dev      FROM tasks WHERE workspace_id = ws_id AND title = 'Development Remediation Rollout' LIMIT 1;
  SELECT id INTO ws_qa       FROM tasks WHERE workspace_id = ws_id AND title = 'QA & Validation'                 LIMIT 1;
  SELECT id INTO ws_tracking FROM tasks WHERE workspace_id = ws_id AND title = 'Tracking, Logging & Close-out'   LIMIT 1;

  -- ─── Production site tasks (36 sites) ────────────────────────────────────
  -- Phase 1 → Days 1–3  (Mar 31 – Apr 2)  Sites 1–13
  -- Phase 2 → Days 4–8  (Apr 3 – Apr 9)   Sites 14–36
  -- Each task gets the site URL + env + phase + risk + 37 min baseline in desc

  INSERT INTO tasks (
    id, workspace_id, project_id, parent_task_id,
    title, description, status, priority, estimated_hours, due_date, created_by
  )
  SELECT
    gen_random_uuid(), ws_id, apac_project_id, ws_prod,
    t.title, t.meta, 'Todo', 'High', 0.617, t.due_date, admin_id
  FROM (VALUES
    -- Day 1 (Mar 31) — Phase 1
    ('Remediate akisnotok.com.au',              '{"url":"https://akisnotok.com.au","env":"Production","phase":"Phase 1","risk":"Open","baseline_min":37}',              '2026-03-31'::date),
    ('Remediate arixtra.com.au',                '{"url":"https://arixtra.com.au","env":"Production","phase":"Phase 1","risk":"Open","baseline_min":37}',                '2026-03-31'::date),
    ('Remediate aspen.ph',                      '{"url":"https://aspen.ph","env":"Production","phase":"Phase 1","risk":"Open","baseline_min":37}',                      '2026-03-31'::date),
    ('Remediate aspenaltitude.com.au',          '{"url":"https://aspenaltitude.com.au","env":"Production","phase":"Phase 1","risk":"Open","baseline_min":37}',          '2026-03-31'::date),
    -- Day 2 (Apr 1) — Phase 1
    ('Remediate aspenantidote.com.au',          '{"url":"https://aspenantidote.com.au","env":"Production","phase":"Phase 1","risk":"Open","baseline_min":37}',          '2026-04-01'::date),
    ('Remediate aspenengage.com.au',            '{"url":"https://aspenengage.com.au","env":"Production","phase":"Phase 1","risk":"Open","baseline_min":37}',            '2026-04-01'::date),
    ('Remediate aspenhub.co.nz',                '{"url":"https://aspenhub.co.nz","env":"Production","phase":"Phase 1","risk":"Open","baseline_min":37}',                '2026-04-01'::date),
    ('Remediate aspenmalaysia.com',             '{"url":"https://aspenmalaysia.com","env":"Production","phase":"Phase 1","risk":"Open","baseline_min":37}',             '2026-04-01'::date),
    ('Remediate aspenonlinelearning.com.au',    '{"url":"https://aspenonlinelearning.com.au","env":"Production","phase":"Phase 1","risk":"Open","baseline_min":37}',    '2026-04-01'::date),
    -- Day 3 (Apr 2) — Phase 1
    ('Remediate aspenpromo.com.au',             '{"url":"https://aspenpromo.com.au","env":"Production","phase":"Phase 1","risk":"Open","baseline_min":37}',             '2026-04-02'::date),
    ('Remediate aspensalesexpress.com.au',      '{"url":"https://aspensalesexpress.com.au","env":"Production","phase":"Phase 1","risk":"Open","baseline_min":37}',      '2026-04-02'::date),
    ('Remediate betternightsbetterdays.com.au', '{"url":"https://betternightsbetterdays.com.au","env":"Production","phase":"Phase 1","risk":"Open","baseline_min":37}', '2026-04-02'::date),
    ('Remediate bio-oil.com.au',                '{"url":"https://bio-oil.com.au","env":"Production","phase":"Phase 1","risk":"Open","baseline_min":37}',                '2026-04-02'::date),
    -- Day 4 (Apr 3) — Phase 2
    ('Remediate circadin.com.au',               '{"url":"https://circadin.com.au","env":"Production","phase":"Phase 2","risk":"Open","baseline_min":37}',               '2026-04-03'::date),
    ('Remediate coloxyl.com.au',                '{"url":"https://coloxyl.com.au","env":"Production","phase":"Phase 2","risk":"Open","baseline_min":37}',                '2026-04-03'::date),
    ('Remediate coloxyl.com.hk',                '{"url":"https://coloxyl.com.hk","env":"Production","phase":"Phase 2","risk":"Open","baseline_min":37}',                '2026-04-03'::date),
    ('Remediate cortal.com.hk',                 '{"url":"https://cortal.com.hk","env":"Production","phase":"Phase 2","risk":"Open","baseline_min":37}',                 '2026-04-03'::date),
    ('Remediate dermeze.com',                   '{"url":"https://dermeze.com","env":"Production","phase":"Phase 2","risk":"Open","baseline_min":37}',                   '2026-04-03'::date),
    -- Day 5 (Apr 6) — Phase 2
    ('Remediate dymadon.com.au',                '{"url":"https://dymadon.com.au","env":"Production","phase":"Phase 2","risk":"Open","baseline_min":37}',                '2026-04-06'::date),
    ('Remediate eikance.com.au',                '{"url":"https://eikance.com.au","env":"Production","phase":"Phase 2","risk":"Open","baseline_min":37}',                '2026-04-06'::date),
    ('Remediate eltroxin.co.nz',                '{"url":"https://eltroxin.co.nz","env":"Production","phase":"Phase 2","risk":"Open","baseline_min":37}',                '2026-04-06'::date),
    ('Remediate fleurstat.co.nz',               '{"url":"https://fleurstat.co.nz","env":"Production","phase":"Phase 2","risk":"Open","baseline_min":37}',               '2026-04-06'::date),
    -- Day 6 (Apr 7) — Phase 2
    ('Remediate flo.com.au',                    '{"url":"https://flo.com.au","env":"Production","phase":"Phase 2","risk":"Open","baseline_min":37}',                    '2026-04-07'::date),
    ('Remediate gastrostop.com.au',             '{"url":"https://gastrostop.com.au","env":"Production","phase":"Phase 2","risk":"Open","baseline_min":37}',             '2026-04-07'::date),
    ('Remediate goutshield.com.au',             '{"url":"https://goutshield.com.au","env":"Production","phase":"Phase 2","risk":"Open","baseline_min":37}',             '2026-04-07'::date),
    ('Remediate hcp.eikance.com.au',            '{"url":"https://hcp.eikance.com.au","env":"Production","phase":"Phase 2","risk":"Open","baseline_min":37}',            '2026-04-07'::date),
    ('Remediate maltofer.co.nz',                '{"url":"https://maltofer.co.nz","env":"Production","phase":"Phase 2","risk":"Open","baseline_min":37}',                '2026-04-07'::date),
    -- Day 7 (Apr 8) — Phase 2
    ('Remediate maltofer.com.au',               '{"url":"https://maltofer.com.au","env":"Production","phase":"Phase 2","risk":"Open","baseline_min":37}',               '2026-04-08'::date),
    ('Remediate patient.eikance.com.au',        '{"url":"https://patient.eikance.com.au","env":"Production","phase":"Phase 2","risk":"Open","baseline_min":37}',        '2026-04-08'::date),
    ('Remediate reandron.com.au',               '{"url":"https://reandron.com.au","env":"Production","phase":"Phase 2","risk":"Open","baseline_min":37}',               '2026-04-08'::date),
    ('Remediate stingose.com.au',               '{"url":"https://stingose.com.au","env":"Production","phase":"Phase 2","risk":"Open","baseline_min":37}',               '2026-04-08'::date),
    -- Day 8 (Apr 9) — Phase 2
    ('Remediate tackletd.com.au',               '{"url":"https://tackletd.com.au","env":"Production","phase":"Phase 2","risk":"Open","baseline_min":37}',               '2026-04-09'::date),
    ('Remediate tolak.com.au',                  '{"url":"https://tolak.com.au","env":"Production","phase":"Phase 2","risk":"Open","baseline_min":37}',                  '2026-04-09'::date),
    ('Remediate ural-australia.com',            '{"url":"https://ural-australia.com","env":"Production","phase":"Phase 2","risk":"Open","baseline_min":37}',            '2026-04-09'::date),
    ('Remediate uramet.com.au',                 '{"url":"https://uramet.com.au","env":"Production","phase":"Phase 2","risk":"Open","baseline_min":37}',                 '2026-04-09'::date),
    ('Remediate zanzole24hr.com.au',            '{"url":"https://zanzole24hr.com.au","env":"Production","phase":"Phase 2","risk":"Open","baseline_min":37}',            '2026-04-09'::date)
  ) AS t(title, meta, due_date)
  WHERE NOT EXISTS (
    SELECT 1 FROM tasks
    WHERE workspace_id = ws_id AND project_id = apac_project_id AND title = t.title
  );

  -- ─── Development site tasks (16 sites) ───────────────────────────────────
  -- Phase 3 → Days 9–11 (Apr 10 – Apr 14)  Sites 37–52
  -- WP Engine (15) + Flywheel (1)

  INSERT INTO tasks (
    id, workspace_id, project_id, parent_task_id,
    title, description, status, priority, estimated_hours, due_date, created_by
  )
  SELECT
    gen_random_uuid(), ws_id, apac_project_id, ws_dev,
    t.title, t.meta, 'Todo', 'Medium', 0.617, t.due_date, admin_id
  FROM (VALUES
    -- Day 9 (Apr 10) — Phase 3
    ('Remediate cartia.wpengine.com',          '{"url":"https://cartia.wpengine.com","env":"WP Engine","phase":"Phase 3","risk":"Open","baseline_min":37}',          '2026-04-10'::date),
    ('Remediate cartiastg.wpenginepowered.com','{"url":"https://cartiastg.wpenginepowered.com","env":"WP Engine","phase":"Phase 3","risk":"Open","baseline_min":37}','2026-04-10'::date),
    ('Remediate circadinnz.wpengine.com',      '{"url":"https://circadinnz.wpengine.com","env":"WP Engine","phase":"Phase 3","risk":"Open","baseline_min":37}',      '2026-04-10'::date),
    ('Remediate circadinnz2017.wpengine.com',  '{"url":"https://circadinnz2017.wpengine.com","env":"WP Engine","phase":"Phase 3","risk":"Open","baseline_min":37}',  '2026-04-10'::date),
    ('Remediate coloxyl.wpengine.com',         '{"url":"https://coloxyl.wpengine.com","env":"WP Engine","phase":"Phase 3","risk":"Open","baseline_min":37}',         '2026-04-10'::date),
    -- Day 10 (Apr 13) — Phase 3
    ('Remediate coloxylstg.wpengine.com',      '{"url":"https://coloxylstg.wpengine.com","env":"WP Engine","phase":"Phase 3","risk":"Open","baseline_min":37}',      '2026-04-13'::date),
    ('Remediate coloxyl2016.wpengine.com',     '{"url":"https://coloxyl2016.wpengine.com","env":"WP Engine","phase":"Phase 3","risk":"Open","baseline_min":37}',     '2026-04-13'::date),
    ('Remediate coloxylhktest.wpengine.com',   '{"url":"https://coloxylhktest.wpengine.com","env":"WP Engine","phase":"Phase 3","risk":"Open","baseline_min":37}',   '2026-04-13'::date),
    ('Remediate dermeze.wpengine.com',         '{"url":"https://dermeze.wpengine.com","env":"WP Engine","phase":"Phase 3","risk":"Open","baseline_min":37}',         '2026-04-13'::date),
    ('Remediate gastrostop.wpengine.com',      '{"url":"https://gastrostop.wpengine.com","env":"WP Engine","phase":"Phase 3","risk":"Open","baseline_min":37}',      '2026-04-13'::date),
    -- Day 11 (Apr 14) — Phase 3
    ('Remediate malaysia.wpengine.com',        '{"url":"https://malaysia.wpengine.com","env":"WP Engine","phase":"Phase 3","risk":"Open","baseline_min":37}',        '2026-04-14'::date),
    ('Remediate malaysiastage.wpengine.com',   '{"url":"https://malaysiastage.wpengine.com","env":"WP Engine","phase":"Phase 3","risk":"Open","baseline_min":37}',   '2026-04-14'::date),
    ('Remediate maltoferdev.wpengine.com',     '{"url":"https://maltoferdev.wpengine.com","env":"WP Engine","phase":"Phase 3","risk":"Open","baseline_min":37}',     '2026-04-14'::date),
    ('Remediate physiciansau.wpengine.com',    '{"url":"https://physiciansau.wpengine.com","env":"WP Engine","phase":"Phase 3","risk":"Open","baseline_min":37}',    '2026-04-14'::date),
    ('Remediate stingose.wpengine.com',        '{"url":"https://stingose.wpengine.com","env":"WP Engine","phase":"Phase 3","risk":"Open","baseline_min":37}',        '2026-04-14'::date),
    ('Remediate cortalhk.flywheelsites.com',   '{"url":"https://cortalhk.flywheelsites.com","env":"Flywheel","phase":"Phase 3","risk":"Open","baseline_min":37}',   '2026-04-14'::date)
  ) AS t(title, meta, due_date)
  WHERE NOT EXISTS (
    SELECT 1 FROM tasks
    WHERE workspace_id = ws_id AND project_id = apac_project_id AND title = t.title
  );

  RAISE NOTICE 'APAC Sprint seed complete — workspace %, project %', ws_id, apac_project_id;

END $$;
