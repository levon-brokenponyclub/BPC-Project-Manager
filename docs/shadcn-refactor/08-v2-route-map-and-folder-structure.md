# V2 Route Map and Folder Structure

## Purpose

This document is the implementation-ready route and folder plan for the isolated `v2/` rebuild.

It is based on the current production code, not assumptions.

## Source of Truth Reviewed

Routes and access model were derived from:

- `src/App.tsx`
- `src/main.tsx`
- `src/components/layout/AppShell.tsx`
- `src/components/auth/RequireAuth.tsx`
- `src/pages/workspace/SettingsPage.tsx`
- current page files under `src/pages/` and `src/pages/workspace/`

## Core Decisions

- V2 stays isolated inside `v2/`
- V2 uses React Router
- V2 uses Radix UI via shadcn
- V2 supports dark and light mode in one app
- V2 does not use a second light init pass
- V2 does not use `--rtl` by default

## Non-Negotiable V2 UI Rules

- shadcn + Radix primitives are the only primitive system
- no custom primitive replacements (`Button`, `Dialog`, `Sheet`, `Select`, `Tabs`, `Tooltip`, etc.)
- no legacy carryover from current `src/`
- no V1 imports in V2
- composition over abstraction
- routes stay thin (load + assemble only)
- business logic belongs to feature modules
- shared UI surfaces live in `app/surfaces`

## Current Production Route Inventory

### Public routes

| Current URL    | Current Component | Auth   | Notes                                  |
| -------------- | ----------------- | ------ | -------------------------------------- |
| `/login`       | `LoginPage`       | Public | Primary auth entry                     |
| `/auth/invite` | `AuthInvitePage`  | Public | Invite acceptance / account completion |

### Authenticated non-workspace route

| Current URL   | Current Component     | Auth     | Notes             |
| ------------- | --------------------- | -------- | ----------------- |
| `/workspaces` | `WorkspaceSelectPage` | Required | Workspace chooser |

### Authenticated workspace-scoped routes

All of these currently render inside `RequireAuth -> AppShell -> Outlet`.

| Current URL                        | Current Component     | Nav Status      | Role Notes                                                   |
| ---------------------------------- | --------------------- | --------------- | ------------------------------------------------------------ |
| `/w/:workspaceId`                  | redirect              | n/a             | redirects to `project-overview`                              |
| `/w/:workspaceId/dashboard`        | `DashboardPage`       | Not primary nav | still exists; should be treated as compatibility route in V2 |
| `/w/:workspaceId/project-overview` | `ProjectOverviewPage` | Primary nav     | shared workspace route                                       |
| `/w/:workspaceId/tasks`            | `TasksPage`           | Primary nav     | shared workspace route                                       |
| `/w/:workspaceId/assets`           | `AssetLibraryPage`    | Primary nav     | shared workspace route                                       |
| `/w/:workspaceId/users`            | `UsersPage`           | Primary nav     | shared workspace route                                       |
| `/w/:workspaceId/clients`          | `ClientsPage`         | Admin nav       | admin-oriented management surface                            |
| `/w/:workspaceId/time`             | `TimePage`            | Admin nav       | page has role-aware behavior                                 |
| `/w/:workspaceId/reports`          | `ReportsPage`         | Admin nav       | admin-oriented reporting surface                             |
| `/w/:workspaceId/settings`         | `SettingsPage`        | Admin nav       | route is shared, but visible tabs vary by role               |

### Global redirects

| Current URL | Current Behavior          |
| ----------- | ------------------------- |
| `/`         | redirect to `/workspaces` |
| `*`         | redirect to `/workspaces` |

## Current Access Model

### Shell navigation groups

From `AppShell`:

Shared workspace nav:

- `project-overview`
- `tasks`
- `assets`
- `users`

Admin nav:

- `clients`
- `time`
- `reports`
- `settings`

### Settings sub-sections

From `SettingsPage`:

Shared settings panels:

- `profile`
- `notifications`

Admin-only settings panels:

- `workspace`
- `client_access`
- `testing`

## Recommended V2 Route Map

## Public routes

| Priority | URL            | V2 Module                           | Access | Recommendation |
| -------- | -------------- | ----------------------------------- | ------ | -------------- |
| P0       | `/login`       | `app/routes/public/login.tsx`       | Public | Build first    |
| P0       | `/auth/invite` | `app/routes/public/auth-invite.tsx` | Public | Build first    |

## Authenticated routes

| Priority | URL                 | V2 Module                                | Access        | Recommendation                                                                                |
| -------- | ------------------- | ---------------------------------------- | ------------- | --------------------------------------------------------------------------------------------- |
| P0       | `/workspaces`       | `app/routes/workspaces/index.tsx`        | Auth required | Build first                                                                                   |
| P0       | `/workspace-select` | redirect module or alias in route config | Auth required | Keep temporary compatibility alias because current code still references it in `SettingsPage` |

## Workspace layout routes

| Priority | URL                                | V2 Module                                   | Access                              | Recommendation                                                                                                         |
| -------- | ---------------------------------- | ------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| P0       | `/w/:workspaceId`                  | redirect from workspace layout              | Auth required                       | Redirect to `/w/:workspaceId/project-overview`                                                                         |
| P1       | `/w/:workspaceId/project-overview` | `app/routes/workspace/project-overview.tsx` | Shared                              | Primary landing route                                                                                                  |
| P1       | `/w/:workspaceId/tasks`            | `app/routes/workspace/tasks.tsx`            | Shared                              | Core workstream route                                                                                                  |
| P1       | `/w/:workspaceId/assets`           | `app/routes/workspace/assets.tsx`           | Shared                              | Core workstream route                                                                                                  |
| P1       | `/w/:workspaceId/users`            | `app/routes/workspace/users.tsx`            | Shared                              | Core workstream route                                                                                                  |
| P2       | `/w/:workspaceId/clients`          | `app/routes/workspace/clients.tsx`          | Admin                               | Keep as admin route                                                                                                    |
| P2       | `/w/:workspaceId/time`             | `app/routes/workspace/time.tsx`             | Shared route with role-aware UI     | Keep role-aware behavior                                                                                               |
| P2       | `/w/:workspaceId/reports`          | `app/routes/workspace/reports.tsx`          | Admin                               | Keep as admin route                                                                                                    |
| P1       | `/w/:workspaceId/settings`         | `app/routes/workspace/settings.tsx`         | Shared route with role-aware panels | Keep one route initially                                                                                               |
| P1       | `/w/:workspaceId/dashboard`        | redirect module                             | Auth required                       | Keep temporary compatibility alias to `project-overview` unless V2 intentionally preserves the separate dashboard page |

## Redirects

| Priority | URL | Behavior                  |
| -------- | --- | ------------------------- |
| P0       | `/` | Redirect to `/workspaces` |
| P0       | `*` | Redirect to `/workspaces` |

## Recommendation on `/dashboard`

I do not recommend carrying `DashboardPage` forward as a separate first-class V2 route unless you know it still has business value.

Why:

- primary nav uses `project-overview`, not `dashboard`
- current routing keeps both, which increases maintenance cost
- notification fallbacks still reference `/dashboard`, so V2 should keep a temporary compatibility redirect

Recommended V2 behavior:

- keep `/w/:workspaceId/dashboard` as a redirect to `/w/:workspaceId/project-overview`
- update notification route generation later to point to `project-overview`

## Recommendation on `/workspace-select`

Current code still contains `"/workspace-select"` references in `SettingsPage`, but the real route is `/workspaces`.

Recommended V2 behavior:

- canonical route: `/workspaces`
- temporary compatibility redirect: `/workspace-select -> /workspaces`
- remove old references during V2 cleanup

## Recommended V2 Folder Structure

This is the recommended working structure after scaffolding the isolated React Router app inside `v2/`.

```text
v2/
├── app/
│   ├── components/
│   │   └── ui/
│   ├── features/
│   │   ├── assets/
│   │   ├── auth/
│   │   ├── notifications/
│   │   ├── profile/
│   │   ├── reports/
│   │   ├── settings/
│   │   ├── tasks/
│   │   ├── time/
│   │   ├── users/
│   │   └── workspaces/
│   ├── layout/
│   │   ├── app-shell.tsx
│   │   ├── workspace-sidebar.tsx
│   │   └── topbar.tsx
│   ├── surfaces/
│   │   ├── command-palette/
│   │   ├── dialogs/
│   │   ├── sheets/
│   │   └── toasts/
│   ├── lib/
│   ├── providers/
│   ├── routes/
│   │   ├── public/
│   │   │   ├── auth-invite.tsx
│   │   │   └── login.tsx
│   │   ├── workspace/
│   │   │   ├── assets.tsx
│   │   │   ├── clients.tsx
│   │   │   ├── layout.tsx
│   │   │   ├── project-overview.tsx
│   │   │   ├── reports.tsx
│   │   │   ├── settings.tsx
│   │   │   ├── tasks.tsx
│   │   │   ├── time.tsx
│   │   │   └── users.tsx
│   │   ├── redirects/
│   │   │   ├── dashboard-redirect.tsx
│   │   │   └── workspace-select-redirect.tsx
│   │   └── workspaces/
│   │       └── index.tsx
│   ├── services/
│   │   ├── api/
│   │   └── supabase/
│   ├── styles/
│   ├── types/
│   ├── root.tsx
│   └── routes.ts
├── public/
├── components.json
├── package.json
└── ...tooling files
```

## Folder Rules

### `app/components/ui`

Use only shadcn-generated and shadcn-composed primitives here.

Allowed:

- shadcn component files
- small adapter wrappers if required for app-wide API stability

Not allowed:

- new custom primitive systems that bypass shadcn
- duplicated button/input/card implementations
- custom behavior wrappers that replace primitive interaction logic

### `app/layout`

Custom layout is allowed here only:

- app shell
- side navigation
- top bars and route framing

Do not move primitives into layout.

### `app/surfaces`

Shared interaction surfaces belong here:

- task drawer (Sheet-based)
- dialogs/modals (Dialog-based)
- command palette
- global toasts

Do not implement these as ad hoc page-local primitive replacements.

### `app/features/*`

Feature domains hold business-specific UI and logic:

- queries
- mutations
- feature hooks
- feature components
- mappers/formatters specific to that domain

### `app/routes/*`

Route modules stay thin.

Each route should primarily:

- load feature state
- set metadata if needed
- assemble feature components
- avoid becoming the main business-logic file

Do not place large UI trees or feature orchestration logic in route files.

### `app/features/*`

Domain-first ownership per feature:

- `components/`
- `hooks/`
- `api/`
- `types/`

Feature modules own business logic, transformations, and behavior.

## Critical Surface Composition Patterns

### Task drawer pattern

Use:

- `Sheet` (right side)
- `Tabs` for drawer sections
- `Input` and `Textarea`
- `Select` or `Popover` for structured fields

No custom drawer implementation.

### Modal pattern

Use:

- `Dialog`
- `DialogContent`

No custom modal system.

### Task list mapping

Use:

- `Card` for list containers
- `Badge` for status
- `DropdownMenu` for row actions
- `Checkbox` for completion state

### Status system

Use `Badge` variants only:

- `default`
- `secondary`
- `destructive`
- `outline`

No custom status primitives.

### Charts

Use shadcn chart primitives directly at first.
Do not add an abstraction layer until concrete duplication appears.

### `app/services/api`

Use this as the V2 replacement for current `src/api/*`.

Suggested mapping:

- `src/api/tasks.ts` -> `app/services/api/tasks.ts`
- `src/api/workspaces.ts` -> `app/services/api/workspaces.ts`
- `src/api/notifications.ts` -> `app/services/api/notifications.ts`
- and so on

### `app/lib`

Use this for app-wide infrastructure:

- supabase client
- query client
- theme utilities
- role-view helpers
- generic utilities

## Recommended Provider Layout

V2 should preserve the current provider order conceptually:

1. Theme provider
2. Query client provider
3. Auth provider
4. Toast provider
5. Router app shell

## Recommended V2 Build Order for Tomorrow

### Day 1 start order

1. Scaffold V2 in `v2/`
2. Confirm route config works with:
   - `/login`
   - `/workspaces`
   - `/w/:workspaceId/project-overview`
3. Build `workspace/layout.tsx`
4. Add temporary redirects for:
   - `/workspace-select`
   - `/w/:workspaceId/dashboard`
5. Build one complete vertical slice:
   - tasks route shell
   - task list with primitive composition
   - task drawer as shared Sheet surface
   - create task flow
6. Build route shells for:
   - login
   - workspace selector
   - project overview
   - settings

### Day 1 minimum success criteria

- V2 app boots independently
- all route skeletons exist
- redirects are working
- dark and light theme tokens are wired
- current app remains untouched
- no custom primitive components were introduced

## Recommended Route Config Priorities

### Must exist before feature migration

- `/login`
- `/auth/invite`
- `/workspaces`
- `/w/:workspaceId`
- `/w/:workspaceId/project-overview`
- `/w/:workspaceId/tasks`
- `/w/:workspaceId/settings`
- `/workspace-select` redirect
- `/w/:workspaceId/dashboard` redirect

### Can follow after shell is stable

- `/w/:workspaceId/assets`
- `/w/:workspaceId/users`
- `/w/:workspaceId/clients`
- `/w/:workspaceId/time`
- `/w/:workspaceId/reports`

## Final Recommendation

For tomorrow's start, I recommend:

- preserve the current route URLs wherever they still matter
- simplify V2 by treating `project-overview` as the main workspace landing route
- keep temporary compatibility redirects for stale paths instead of copying legacy route debt forward
- keep settings as one route with role-aware tabs first, then split later only if deep-linking becomes necessary
