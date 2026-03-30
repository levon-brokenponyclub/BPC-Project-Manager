# Phase 1 Backlog: File-Level Migration Matrix (Shadcn-Only UI Layer)

## Objective

Phase 1 migrates the app to a shadcn-only primitive layer for:

- Button
- Input
- Textarea
- Card
- Badge
- Avatar
- Skeleton

Policy for this phase:

- No net-new custom primitive APIs in src/components/ui.
- Existing custom wrappers must compose shadcn primitives only.
- Legacy visual behavior can remain, but implementation ownership moves to shadcn primitives.

## Owner Model

Owners below are suggested functional owners (replace with names):

- FE-Core: UI primitives and shared contracts
- FE-Auth: auth pages and flows
- FE-Workspace: workspace pages and dashboard surfaces
- FE-Tasks: task modal, drawer, list flows
- FE-Profile: profile/settings account surfaces

## Component Priority (from current import frequency)

| Priority | Component |                         Import Count |
| -------- | --------- | -----------------------------------: |
| P1       | Card      |                                   15 |
| P1       | Button    |                                   14 |
| P1       | Input     |                                    8 |
| P2       | Badge     |                                    3 |
| P2       | Textarea  |                                    2 |
| P2       | Skeleton  |                                    2 |
| P3       | Avatar    | 0 direct imports in current grep map |

## Primitive Source Files (must migrate first)

| Backlog ID | File                           | Owner   | Est. | Risk   | Notes                                                         |
| ---------- | ------------------------------ | ------- | ---: | ------ | ------------------------------------------------------------- |
| P1-001     | src/components/ui/button.tsx   | FE-Core |   4h | High   | Highest blast radius via variants and disabled/loading states |
| P1-002     | src/components/ui/input.tsx    | FE-Core |   2h | Medium | Form behavior and focus ring parity                           |
| P1-003     | src/components/ui/textarea.tsx | FE-Core |   2h | Medium | Textarea sizing and placeholder contrast parity               |
| P1-004     | src/components/ui/card.tsx     | FE-Core |   1h | Low    | Surface and border token mapping                              |
| P1-005     | src/components/ui/badge.tsx    | FE-Core |   2h | Medium | Status colors and semantic variants                           |
| P1-006     | src/components/ui/avatar.tsx   | FE-Core |   2h | Medium | Fallback behavior and image sizing                            |
| P1-007     | src/components/ui/skeleton.tsx | FE-Core |   1h | Low    | Animation and contrast parity                                 |

## Phase 1 File-Level Migration Matrix

| Backlog ID | File                                           | Owner        | Uses                          | Est. | Risk   | Why                                                       |
| ---------- | ---------------------------------------------- | ------------ | ----------------------------- | ---: | ------ | --------------------------------------------------------- |
| P1-010     | src/components/layout/AppShell.tsx             | FE-Workspace | Button                        |   8h | High   | 1654 lines, nav and global actions are high impact        |
| P1-011     | src/components/tasks/TaskDrawer.tsx            | FE-Tasks     | Button, Input, Textarea       |  10h | High   | 1679 lines, dense editing interactions                    |
| P1-012     | src/pages/workspace/SettingsPage.tsx           | FE-Profile   | Button, Card, Input           |  10h | High   | 1805 lines, many form and panel states                    |
| P1-013     | src/components/tasks/NewTaskModal.tsx          | FE-Tasks     | Button, Input, Textarea       |   8h | High   | 837 lines, critical create flow                           |
| P1-014     | src/pages/workspace/DashboardPage.tsx          | FE-Workspace | Button, Card                  |   6h | Medium | 1126 lines, many card/action surfaces                     |
| P1-015     | src/pages/workspace/TasksPage.tsx              | FE-Tasks     | Button, Card                  |   6h | Medium | 1084 lines, dense list controls                           |
| P1-016     | src/pages/workspace/AssetLibraryPage.tsx       | FE-Workspace | Button, Input                 |   6h | Medium | 1056 lines, mixed filters/actions                         |
| P1-017     | src/pages/workspace/ClientsPage.tsx            | FE-Workspace | Badge, Button, Card, Input    |   6h | Medium | Multiple primitive variants on table views                |
| P1-018     | src/pages/workspace/ProjectOverviewPage.tsx    | FE-Workspace | DataState/EmptyState wrappers |   4h | Medium | Wrapper parity and empty state behavior                   |
| P1-019     | src/components/profile/ProfileEditModal.tsx    | FE-Profile   | Button, Input                 |   5h | Medium | 700 lines, profile forms and upload controls              |
| P1-020     | src/pages/workspace/UsersPage.tsx              | FE-Workspace | Badge, Button, Card           |   4h | Medium | Table row actions and status styles                       |
| P1-021     | src/pages/workspace/TimePage.tsx               | FE-Workspace | Button, Card                  |   3h | Low    | Smaller page with straightforward usage                   |
| P1-022     | src/pages/LoginPage.tsx                        | FE-Auth      | Button, Card, Input           |   3h | Medium | Auth entrypoint, visual regressions are visible           |
| P1-023     | src/pages/AuthInvitePage.tsx                   | FE-Auth      | Button, Input                 |   2h | Low    | Simple form surface                                       |
| P1-024     | src/pages/WorkspaceSelectPage.tsx              | FE-Auth      | Card, Skeleton                |   2h | Low    | Simple card list and loading states                       |
| P1-025     | src/components/time/TimerWidget.tsx            | FE-Workspace | Card                          |   1h | Low    | Small shared widget                                       |
| P1-026     | src/pages/workspace/ReportsPage.tsx            | FE-Workspace | Card                          |   1h | Low    | Small card-based skeleton state                           |
| P1-027     | src/components/tasks/StatusPill.tsx            | FE-Tasks     | Badge                         |   2h | Medium | Status token parity critical to readability               |
| P1-028     | src/components/auth/RequireAuth.tsx            | FE-Auth      | Skeleton                      |   1h | Low    | Loading-only surface                                      |
| P1-029     | src/components/skeletons/DashboardSkeleton.tsx | FE-Workspace | Card                          |   1h | Low    | Skeleton parity                                           |
| P1-030     | src/components/skeletons/SettingsSkeleton.tsx  | FE-Profile   | Card                          |   1h | Low    | Skeleton parity                                           |
| P1-031     | src/components/skeletons/ReportsSkeleton.tsx   | FE-Workspace | Card                          |   1h | Low    | Skeleton parity                                           |
| P1-032     | src/components/skeletons/TasksSkeleton.tsx     | FE-Tasks     | Card                          |   1h | Low    | Skeleton parity                                           |
| P1-033     | src/components/skeletons/TimeSkeleton.tsx      | FE-Workspace | Card                          |   1h | Low    | Skeleton parity                                           |
| P1-034     | src/components/ui/DataStateWrapper.tsx         | FE-Core      | EmptyState, ErrorState        |   2h | Medium | Keep wrapper but ensure only shadcn primitives internally |
| P1-035     | src/components/ui/ErrorState.tsx               | FE-Core      | Button                        |   1h | Low    | Must compose migrated Button only                         |

## Total Estimate

- Core primitives: 14h
- File-level migration and validation: 85h
- Phase 1 total: about 99h

Recommended practical split:

- 2 developers: 5 to 7 working days
- 1 developer: 10 to 13 working days

## Dependency Order

1. Complete P1-001 to P1-007 first.
2. Then run page/component backlog in this order:
   - High risk: P1-010, P1-011, P1-012, P1-013
   - Medium risk: P1-014 to P1-023
   - Low risk: P1-024 to P1-035

## Acceptance Criteria for Every Backlog Item

- Typescript build passes.
- Existing route behavior unchanged.
- Keyboard/focus behavior unchanged.
- Dark/light parity preserved.
- No ad-hoc primitive forks introduced.

## Exit Criteria for Phase 1

- All primitive components in src/components/ui are shadcn-based.
- All listed files validated against baseline screenshots.
- No remaining legacy primitive code paths in active use.
