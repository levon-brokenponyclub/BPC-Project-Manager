# Shadcn Refactor Project Plan

## Scope and Goal

Refactor the current custom UI layer to shadcn/ui primitives and patterns while preserving:

- existing product behavior
- current dark-first visual language
- accessibility and keyboard UX
- page-level layout and routing behavior

This plan assumes the app stack is React + Vite + TypeScript + Tailwind + React Router.

Parallel V2 option:

- [06-v2-parallel-build-plan.md](06-v2-parallel-build-plan.md)
- [07-cli-prompt-answer-sheet.md](07-cli-prompt-answer-sheet.md)

## What Was Reviewed

- shadcn installation docs
- shadcn component catalog
- shadcn charts area examples
- shadcn directory/registry docs
- shadcn create workflow
- current codebase UI structure and Tailwind token setup

## Effort Estimate

- Overall: Medium
- Team profile: 1 developer full-time
- Timeline: 2 to 3 weeks (or 4 to 6 focused workdays if done as a concentrated migration)

## Phases

### Phase 0: Foundation and Guardrails (Day 1)

Objective: Initialize shadcn safely and freeze migration rules.

Tasks:

1. Create migration branch.
2. Run init command:
   - npx shadcn@latest init --preset b3dQ8GfkPA --template react-router
3. Validate generated files do not break build.
4. Align components.json aliases and output paths with existing src structure.
5. Confirm dark mode strategy remains class-based.
6. Capture baseline screenshots for key pages in light and dark mode.

Exit criteria:

- npm run build passes
- no route regressions
- no token regressions on Login, Workspace Select, Project Overview

### Phase 1: Primitive Swap (Days 1-2)

Objective: Standardize the base ui layer first.

Target components:

- Button
- Input
- Textarea
- Card
- Badge
- Skeleton
- Avatar

Tasks:

1. Replace internals of existing primitives or map imports to shadcn versions.
2. Keep existing public props API where practical to minimize blast radius.
3. Normalize variant naming where needed.
4. Add codemod-style cleanup for dead variants.

Exit criteria:

- all pages compile with no primitive-level regressions
- visual parity on forms, cards, list controls

Execution artifact:

- [05-phase1-component-migration-matrix.md](05-phase1-component-migration-matrix.md)

### Phase 2: Overlay and Interaction Layer (Days 2-4)

Objective: Replace custom interaction surfaces with shadcn composables.

Target patterns:

- Dialog/Modal
- Popover
- Dropdown Menu
- Select
- Tooltip
- Tabs
- Sheet/Drawer

Tasks:

1. Migrate complex flows in task and profile views.
2. Preserve existing keyboard/focus behavior.
3. Add escape key, focus trap, and screen reader checks.
4. Remove ad-hoc z-index and click-outside code where shadcn handles it.

Exit criteria:

- no interaction regressions in task creation/edit flows
- no focus trap bugs

### Phase 3: Data Display and Complex Widgets (Days 4-6)

Objective: Convert higher-complexity UI blocks.

Target patterns:

- table-like layouts and row actions
- status chips and inline editors
- chart cards (Area chart first)

Tasks:

1. Introduce shadcn Chart primitives for existing trend cards where useful.
2. Keep existing business logic unchanged.
3. Validate responsive behavior for desktop and mobile.

Exit criteria:

- task table interactions stable
- chart cards render with no hydration/runtime issues

### Phase 4: Registry Strategy and Internal Distribution (Week 2)

Objective: Make future UI extension repeatable.

Tasks:

1. Define internal component conventions for add command usage.
2. Decide approved third-party registries list.
3. Add policy for code review of registry imports.
4. Optionally scaffold internal registry for BPC-specific blocks.

Exit criteria:

- documented approved registry list
- repeatable command workflow for new components

### Phase 5: Hardening and Release (Week 2)

Objective: Ship with confidence.

Tasks:

1. Cross-page QA matrix (light/dark, admin/client).
2. Accessibility pass on dialogs, forms, menus.
3. Remove dead CSS and legacy helper classes.
4. Update README and release notes.

Exit criteria:

- build + lint pass
- no critical visual regressions
- rollout notes completed

## Risks and Mitigations

1. Variant drift (Button/Badge semantics diverge)

- Mitigation: freeze variant contract early and document mapping.

2. Focus and keyboard regressions in overlays

- Mitigation: explicit keyboard QA scripts per page.

3. Dark theme token mismatch

- Mitigation: keep tokens in styles/theme.css and map shadcn vars to existing tokens.

4. Large one-shot migration risk

- Mitigation: phase by component domain and ship behind branch checkpoints.

## Delivery Gates

Gate A: Foundation complete

- init complete
- build green

Gate B: primitives complete

- core pages visually stable

Gate C: interactions complete

- modal/popover/select flows stable

Gate D: complex widgets complete

- task table and chart cards stable

Gate E: release ready

- docs updated
- changelog updated
- deployment checklist complete
