# V2 Component Mapping and Execution Guides

## Mapping Strategy

V2 is a clean rebuild.

Use composition-first implementation with shadcn primitives:

- create and use primitives from `app/components/ui` only
- assemble feature UI from primitives
- keep route modules thin
- keep business logic in `app/features/*`

Do not:

- import primitives from current `src/components/ui/*`
- recreate primitive components
- introduce wrapper systems that replace primitive behavior

Phase 1 backlog matrix:

- [05-phase1-component-migration-matrix.md](05-phase1-component-migration-matrix.md)

## V2 Component Mapping Rules

### Primitive Components

Required baseline primitives in `app/components/ui`:

- `button`
- `input`
- `textarea`
- `card`
- `badge`
- `avatar`
- `skeleton`

### Interaction Components to Introduce

- `dialog`
- `popover`
- `dropdown-menu`
- `select`
- `tooltip`
- `tabs`
- `sheet`
- `checkbox`

### Data Visualization

- `chart` primitives from shadcn
- area chart variants for dashboard metrics

Do not add a custom abstraction layer initially.

## Guide 1: Initialize V2 Safely

1. Run init command.
2. Verify components.json contains correct aliases and tailwind config path.
3. Set primitive root to `app/components/ui`.
4. Ensure globals css import order remains valid.
5. Confirm dark class mode still active.

Acceptance:

- V2 app compiles and runs independently.
- No UI imports from V1 exist in V2.

## Guide 2: Primitive Usage Policy

1. Use existing shadcn primitive APIs.
2. Prefer composition over primitive extension.
3. Add thin adapters only when absolutely necessary.
4. Keep variant usage constrained to primitive-supported variants.

Acceptance:

- No custom primitive replacements are introduced.

## Guide 3: Overlay and Surface Composition

1. Implement modals with `Dialog` in `app/surfaces/dialogs`.
2. Implement task drawer with `Sheet` in `app/surfaces/sheets`.
3. Implement popovers with `Popover` where needed.
4. Keep surface orchestration in feature modules, not routes.

Acceptance:

- close on escape works
- click outside behavior is correct
- focus trap works for keyboard users

## Guide 4: Tasks Feature Mapping (Critical)

Task list composition:

- `Card` for list containers
- `Badge` for status
- `DropdownMenu` for actions
- `Checkbox` for completion

Task drawer composition:

- `Sheet` with right-side content
- `Tabs` for sections
- `Input` and `Textarea` for fields
- `Select` or `Popover` for structured controls

No custom drawer implementation.

## Guide 5: Charts (Area)

1. Add chart component dependencies as required by shadcn chart docs.
2. Use chart primitives directly in feature composition.
3. Start with one area chart in dashboard and compare data outputs.
4. Validate axis labels, tooltip format, and dark-mode contrast.

Acceptance:

- no visual overflow on small widths
- no SSR/runtime issues in Vite app

## Guide 6: Registry Policy

1. Only add components from approved registries.
2. Review every added file as first-party code.
3. Do not add registry items directly to business feature folders.
4. Require visual QA for any newly imported external block.

Acceptance:

- no unreviewed third-party UI code merged

## Suggested First V2 Build Order

1. button
2. input
3. card
4. badge
5. dropdown-menu
6. checkbox
7. sheet
8. tabs
9. dialog
10. select
11. chart area card

## Definition of Done for Each Component

- type checks pass
- no dead props left behind
- visual parity in light and dark mode
- keyboard and focus behavior validated
- page screenshots updated
- no duplicate primitives created
