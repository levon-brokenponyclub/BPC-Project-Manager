# V2 Parallel Build Plan

## Goal

Build a fully isolated V2 application in a separate folder so the current production app is unaffected.

Supporting artifact:

- [08-v2-route-map-and-folder-structure.md](08-v2-route-map-and-folder-structure.md)

## Folder Strategy

Use:

- `v2/`

Do not use:

- current app root
- shared mutable component files between current app and V2 during scaffold stage

## Recommended Architecture Decision

If V2 is meant to be a fresh design-system rebuild, use a separate app scaffold.
Use a React Router-based V2 app inside `v2/` with Radix UI primitives.

This is a clean rebuild of the UI system.
It is not a component-by-component refactor of the current app.

## Strict Rules

- Current version remains untouched.
- V2 gets its own package.json, config, and generated shadcn files.
- No init command should be run at the current repo root.
- No dual init inside the same V2 app for dark and light presets.
- No separate second light init pass.
- No default RTL flag.
- ShadowUI (shadcn + Radix primitives) is the UI system.
- Do not create custom primitive replacements.
- Do not import UI primitives from current `src/`.
- Do not copy V1 component patterns into V2.
- Build by composing primitives, not by wrapping/replacing primitive behavior.

## ShadowUI System Guardrails

Allowed:

- compose primitives into feature UI
- create app layout constructs (app shell, sidebar, page layout)
- add thin adapters only when absolutely required for integration

Forbidden:

- custom `Button` systems
- custom modal/drawer/select/tab/tooltip primitives
- wrapper layers that replace primitive behavior
- duplicate primitive sets outside `app/components/ui`

One source of truth for primitives in V2:

- `v2/app/components/ui`

## Theme Plan

Do not create separate dark and light apps.
Do not run separate dark and light `init` commands in the same app.

Correct approach:

- one V2 app
- one shadcn init
- one React Router scaffold
- one Radix UI base
- one token system
- dark and light themes implemented through CSS variables and theme switching

## Recommended V2 Init Command

```bash
cd v2
npx shadcn@latest init --preset b3JRFvm6fI --template react-router
```

## Conditional RTL Variant

```bash
npx shadcn@latest init --preset b3JRFvm6fI --template react-router --rtl
```

Use this only if V2 must support right-to-left layouts from day one.

## Not Recommended

```bash
npx shadcn@latest init --preset b3JRFvm6fI
```

Reasons:

- this is not a separate light-theme initialization step
- dark and light themes belong in one V2 app via theme tokens and switching
- do not add `--rtl` unless RTL is a confirmed requirement

## Dark and Light Theme Delivery Plan

### Theme Foundation

- use one shared token file for semantic colors
- define light tokens under `:root`
- define dark tokens under `.dark`
- use theme provider for runtime switching
- keep both themes visually complete from the start

### Theme Deliverables

1. Surface tokens

- background
- foreground
- card
- popover
- border
- input

2. Brand/action tokens

- primary
- secondary
- accent
- muted
- ring
- destructive

3. Product-specific tokens

- status colors
- sidebar colors
- chart colors
- table hover/selected states

### QA Requirement

Every V2 screen must be approved in:

- dark mode
- light mode
- desktop
- mobile

## V2 Build Sequence

1. Scaffold V2 app.
2. Install shadcn preset.
3. Lock token model.
4. Generate required shadcn primitives under `app/components/ui`.
5. Build core shell and auth routes.
6. Build first vertical slice (tasks list -> task drawer -> create task flow).
7. Validate dark/light + responsive + a11y before starting another feature.

## Recommended Initial Scope for V2

- auth/login
- workspace selector
- dashboard shell
- one overview page

## Exit Criteria for V2 Foundation

- current app unchanged
- V2 builds independently
- dark and light themes both working
- shadcn components generated only inside `v2/`
- no custom primitive components in V2
- route files remain thin and feature-driven
