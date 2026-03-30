# V2 Clean Rebuild Action Items Checklist

## Program Setup

- [ ] Create branch: feat/v2-ui-system
- [ ] Confirm V2 is isolated under `v2/` only
- [ ] Confirm no edits are planned in current `src/`
- [ ] Record baseline screenshots for:
  - [ ] Login
  - [ ] Workspace Select
  - [ ] Project Overview
  - [ ] Tasks table + drawer
  - [ ] Users
  - [ ] Settings

## Phase 0: Initialize

- [ ] Run: npx shadcn@latest init --preset b3JRFvm6fI --template react-router
- [ ] Validate generated `components.json` paths
- [ ] Configure primitives root as `app/components/ui`
- [ ] Confirm no `--rtl` flag unless explicitly required
- [ ] Run npm install if dependencies changed
- [ ] Run npm run build
- [ ] Run npm run lint

## Phase 1: System Guardrails

- [ ] Document non-negotiable rule: shadcn is the primitive system
- [ ] Block custom primitive creation in code review checklist
- [ ] Block imports from current `src/components/ui/*` inside V2
- [ ] Confirm all primitives are generated/owned in `app/components/ui`
- [ ] Confirm routes remain thin and business logic lives in `app/features/*`

Validation:

- [ ] No duplicate primitive components exist
- [ ] No wrapper primitive systems exist
- [ ] Dark/light token contrast passes visual QA for auth + shell

## Phase 2: Shared Surfaces

- [ ] Implement task drawer in `app/surfaces/sheets` using `Sheet`
- [ ] Implement modal system in `app/surfaces/dialogs` using `Dialog`
- [ ] Implement command palette in `app/surfaces/command-palette`
- [ ] Wire toasts through shared surface layer

Validation:

- [ ] Keyboard navigation verified
- [ ] Escape key closes overlays
- [ ] Focus return behavior verified

## Phase 3: First Vertical Slice (Tasks)

- [ ] Build tasks route shell
- [ ] Build task list composition with `Card`, `Badge`, `DropdownMenu`, `Checkbox`
- [ ] Build task drawer composition with `Sheet`, `Tabs`, `Input`, `Textarea`, `Select/Popover`
- [ ] Build create task flow end-to-end

Validation:

- [ ] No custom drawer/modal components introduced
- [ ] Route remains thin and delegates to feature modules
- [ ] Desktop and mobile behavior verified in both themes

## Phase 4: Data and Charts

- [ ] Chart component baseline added
- [ ] Area chart integrated in one dashboard card
- [ ] Table action menus audited using `DropdownMenu`
- [ ] Status chips normalized to `Badge` variants only

Validation:

- [ ] chart loads with no console errors
- [ ] responsive behavior validated
- [ ] no data formatting regressions

## Phase 5: Registry and Reuse

- [ ] Define approved community registries
- [ ] Document add command policy
- [ ] Add security review checklist for external components
- [ ] Optional: internal registry proof of concept

## Phase 6: Hardening

- [ ] Remove dead CSS utilities
- [ ] Remove dead component variants
- [ ] Final design review (light + dark)
- [ ] Accessibility spot checks complete
- [ ] Update README
- [ ] Update CHANGELOG

## Release Checklist

- [ ] Build passes
- [ ] Lint passes
- [ ] Netlify deploy preview verified
- [ ] Production deploy approved
- [ ] Post-deploy smoke test complete
- [ ] Confirm no V1 UI imports in V2 via grep search

## Ownership Template

- Program owner:
- UI migration owner:
- QA owner:
- Release owner:
- Target release date:
