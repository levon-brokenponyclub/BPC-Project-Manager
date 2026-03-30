# Suggested Sprint Plan

## Sprint 1 (Foundation + Primitives)

Goals:

- init and baseline validation
- migrate primitive components

Backlog:

1. shadcn init and configuration verification
2. migrate button/input/textarea/card
3. migrate badge/avatar/skeleton
4. visual parity pass on auth and workspace pages

Deliverables:

- merged primitive layer
- no build or lint regressions

## Sprint 2 (Interactions + High-traffic Flows)

Goals:

- migrate overlays and menu/select patterns
- stabilize task creation and editing flows

Backlog:

1. dialog/popover/dropdown/select/sheet/tabs
2. task modal and drawer migration
3. settings/profile interaction updates
4. keyboard/a11y QA

Deliverables:

- stable interaction surfaces
- reduced custom interaction code

## Sprint 3 (Charts + Cleanup + Release)

Goals:

- add chart baseline
- remove dead UI code
- finalize release docs

Backlog:

1. chart area integration for overview card
2. cleanup deprecated utility classes
3. update README and changelog
4. release QA and deploy

Deliverables:

- production-ready shadcn-aligned UI layer
- rollout and rollback notes complete

## Rollback Plan

- keep migration in feature branch until Gate E
- tag pre-refactor commit before release
- if regression found after deploy:
  1. revert UI migration commit set
  2. redeploy prior build
  3. open follow-up bugfix branch
