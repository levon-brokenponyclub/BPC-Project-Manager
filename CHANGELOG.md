# Changelog

All notable changes to the Broken Pony Club Client Portal are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.1.0] - 2026-03-30

### ✅ Added

#### User Profile Management

- **Self-edit profile dialog** — sidebar nav avatar triggers an edit dialog: upload avatar, update first name, surname, and password
- **Avatar hover overlay** — entire avatar image is the click target; dark overlay with camera icon + "Edit" label appears on hover
- **Admin edit profile** — Settings → Teams: each member row now shows their avatar; dropdown has new "Edit Profile" action
- **Admin profile edit dialog** — avatar upload, first name, surname fields; saves via `admin-users` edge function `update_profile` action
- **Full name resolution in task detail** — Owner and Assigned To in task right sidebar now display `First Surname` instead of email/username
- **Avatar images in task activity** — activity tab now renders `<Avatar>` with the actor's real avatar image; falls back to initials

#### Settings — Teams Tab

- Member rows now display avatar thumbnails alongside name and email
- `WorkspaceMember` type extended with `first_name`, `surname`, `avatar_url`
- "Edit Profile" dropdown item added above "Edit Role" per member

#### DB Migrations

- `20260330150000_drop_auto_assign_client_trigger.sql` — removes V1 trigger that overrode invited user roles with `client`
- `20260330160000_avatars_admin_upload_policy.sql` — RLS policies allowing workspace admins to upload/update/delete avatars for any user (bypasses own-folder restriction for admin role)

---

## [2.0.0] - 2026-03-30

### ✅ Added — V2 Platform Launch

Full rebuild of the BPC Project Management portal using React Router 7, shadcn/ui, TailwindCSS v4, and Supabase client loaders. V2 runs in parallel with V1 at `/v2/` and replaces V1 for production use.

#### Auth & Workspace

- Multi-workspace support via `?ws=<id>` query param on all routes
- Workspace switcher in sidebar header
- Role-based access model: `admin`, `member`, `client`, `viewer`
- Viewer role redirect — all non-dashboard routes redirect to sprint dashboard
- Admin-only Settings visibility in sidebar
- Magic-link invite flow via Supabase Edge Function with robust delivery detection

#### Tasks

- Full task list with TanStack React Table
- Grouped by status (Todo / Upcoming / In Progress / In Review / Awaiting Client / On Hold / Complete / Cancelled)
- Groups expanded by default
- Default sort: Date Added descending
- Show/Hide Completed toggle — hidden by default — with header control and count badge
- Filter by workstream parent via `?parent=<task_id>`
- Breadcrumb updates to show active workstream name when filtered
- Task detail side panel: editable title, status, priority, due date, description, estimated hours, assignee, billable, client visible, blocked flags
- Description renders URLs as clickable hyperlinks
- Subtask list in detail panel right sidebar
- Delete task with cascade on subtasks
- Date Added column added to table
- Assignee column removed from table
- Pagination removed — all tasks render in single table view

#### Inbox

- Received messages list with unread tracking and read-on-open behaviour
- Sent mailbox view (`/inbox?box=sent`)
- Pinned mailbox view (`/inbox?box=pinned`)
- Archived mailbox view (`/inbox?box=archived`)
- Sidebar Inbox item with collapsible Sent / Pinned / Archived submenus
- Per-message action menu: Pin / Unpin, Archive / Move to Inbox, Delete
- Pin and Archive state persisted in notification `payload.inbox_meta` — no schema migration required
- Thread view with full reply chain
- Reply composer with Cmd+Enter shortcut
- Realtime updates via Supabase channel subscription
- Unread count badge on Inbox nav item
- Preview card layout: sender + timestamp row, bold type label, two-line clamped body

#### Sprint Dashboard

- APAC Web Fonts Compliance Remediation sprint dashboard at `/sprint-dashboard`
- KPI cards: Total Tasks, Complete, In Progress, Blocked
- Completion progress bar
- Tasks by Status bar chart
- Tasks by Priority bar chart
- Seed data: 6 workstreams, 52 site tasks (36 production, 16 development)

#### Settings

- Left-tab layout: Team tab and Invite tab
- Role editing per member with draft state and explicit Save / Cancel flow
- Invite card with magic-link generation and copy-to-clipboard

#### Sidebar

- APAC project sub-items: Production Remediation Rollout, Development Remediation Rollout
- Projects, Tasks, and Settings default open
- Workspace-scoped nav — `?ws=` appended to all links automatically
- Viewer-only nav mode

#### DB Migrations

- `20260330123000_workspace_users_role_check.sql` — normalises and enforces allowed roles (`admin`, `member`, `client`, `viewer`)

---

## [1.11.0] - 2026-03-10

### ✅ Changed

- **Default Theme**: Set Dark Mode as the default system theme for all new users.
- **Login UI**: Removed the manual theme switcher from the Login page to maintain brand consistency for guests.

---

## [1.10.0] - 2026-03-09

### ✅ Added

#### User Presence on Users Page (2026-03-09)

- **Status Column**: Display online/offline status for all workspace users with color-coded indicators — green dot + "Online" for users who signed in within the last 5 minutes, gray dot + "Offline" for inactive users
- **Last Online Column**: Relative timestamps showing when offline users were last active ("2 min ago", "1 hour ago", "Yesterday", "2 days ago", "Never"). Shows "—" for users currently online
- **`userPresence.ts` Utility Library**: New utility module with presence logic:
  - `ONLINE_THRESHOLD_MS = 5 * 60 * 1000` — 5-minute threshold for determining online status
  - `getUserPresence(lastSignInAt)` — returns `{ isOnline: boolean, lastOnline: string | null }`
  - `formatRelativeTime(timestamp)` — formats timestamps as human-readable relative time strings
- **Database Migration**: `get_workspace_users_with_emails()` RPC function updated to include `last_sign_in_at` from `auth.users` table
- **TypeScript Interface Update**: `WorkspaceUser` interface extended with `last_sign_in_at?: string | null` field
- **Users Page UI**: Both admin and client views updated with Status and Last Online columns; skeleton loader updated to show 5 columns

**Implementation Notes:**

- Uses Supabase built-in `auth.users.last_sign_in_at` timestamp (not real-time presence)
- 5-minute online threshold provides practical approximation without requiring heartbeat infrastructure
- Preserves all existing workspace-scoped filtering and role-based visibility
- Admin users remain excluded from the Users page list

---

## [1.9.0] - 2026-03-09

### ✅ Added

#### Native Browser Desktop Notifications

Phase-1 browser desktop notification delivery, integrated into the existing Supabase realtime notification pipeline. All new behaviour builds on top of — and does not replace — the Sonner toast system, the inbox, or the unread-count badge.

**New file — `src/lib/browserNotifications.ts`:**

- `isBrowserNotificationSupported()` — safe guard for SSR / non-Notification environments
- `getBrowserNotificationPermission()` — returns current OS permission state or `"unsupported"`
- `requestBrowserNotificationPermission()` — async wrapper around `Notification.requestPermission()`, never throws
- `isDesktopNotificationPaused()` / `setDesktopNotificationPaused()` — in-app opt-out backed by `localStorage` key `bpc_desktop_notifications_paused`
- `isNotificationPromptDismissed()` / `setNotificationPromptDismissed()` — tracks whether the user has dismissed the app-load prompt; key `bpc_desktop_notifications_prompt_dismissed`
- `showBrowserNotification({ title, body, icon, tag, route })` — creates a `Notification`, wires `onclick` to `window.focus()` + route navigation, returns `null` silently on any failure

**Updated — `src/hooks/useRealtimeNotifications.ts`:**

- After the existing Sonner toast, fires `showBrowserNotification()` when `document.visibilityState !== "visible"` (app is in a background tab)
- Self-action dedup, allow-list filtering, and message formatting are all reused — desktop notifications are consistent with inbox rows and toasts

**Updated — `src/components/layout/AppShell.tsx`:**

- App-load notification prompt banner: shown once on mount when browser support is present, permission is `"default"`, and the user has not previously dismissed it
- "Enable" button calls `requestBrowserNotificationPermission()` with Sonner feedback for granted / denied / unsupported outcomes
- "Not now" dismisses the banner and stores the decision in localStorage so it does not reappear
- `Bell` icon added to Lucide imports

**Updated — `src/components/profile/ProfileEditModal.tsx`:**

- **Desktop Notifications section** (all users): permission status badge (Enabled / Paused / Blocked / Not supported), Enable Notifications button for `"default"` state, Pause/Resume toggle for `"granted"` state
- **Desktop Notification Test block** (admin-only): "Send Test Desktop Notification" button fires `showBrowserNotification()` directly — no database row created; requests permission first if still at `"default"`; Sonner feedback for success, blocked, and unsupported cases

### 🔧 Changed

#### Light Mode — `ClientsPage` tokenisation

- Replaced all hardcoded dark hex values (`#191A22`, `#222330`, `#292B38`, `#E3E4EA`) in `ClientsPage.tsx` with design tokens (`bg-card`, `border-border`, `text-foreground`)
- Covers: `ClientsSkeleton`, `UserAvatar` display name, main card and table header borders

---

## [1.8.0] - 2026-03-09

### 🔧 Fixed

#### AppShell — Sticky Header & Inbox Layout (2026-03-09)

- **Sticky header now works everywhere**: `.app-shell` changed from `min-h-screen` (unbounded growth) to `h-screen overflow-hidden`, making the right-side column a true `h-full` flex container. The header's `sticky top-0` now always pins correctly because it lives inside an actual bounded scroll context.
- **Right column scroll**: The column wrapper is `flex-col h-full` with no overflow of its own; `<main>` carries `overflow-y-auto flex-1` so page content scrolls inside its own region.
- **Inbox as flex child**: Inbox section changed from `position: absolute` (which escaped layout flow and caused incorrect height) to a normal `flex-1 min-h-0 overflow-hidden` flex child — identical positioning model to the TaskDrawer.
- **Main hidden while inbox is open**: `<main>` receives `hidden` when `inboxOpen` is true so the inbox section is the sole `flex-1` child and fills the full remaining height below the header.
- **TaskDrawer positioning fixed**: Drawer changed from `position: absolute inset-0` to `position: fixed bottom-0 right-0 top-14` with `left: var(--sidebar-w, 275px)`, ensuring it always sits flush below the header and correctly accounts for sidebar width (collapsed or expanded).
- **TasksPage render restructure**: Tasks page layout restructured to work correctly within the new `overflow-y-auto` main scroll context — removed the `relative min-h-full` wrapper pattern that relied on the old full-document scroll model.

---

## [1.7.0] - 2026-03-09

### ✅ Added

#### Project Overview — Premium Dashboard Upgrade (2026-03-09)

**New primitives in `OverviewCards.tsx`:**

- **`TrendBadge`**: Compact `+N / -N vs last wk` pill rendered on the "Done This Week" metric card. Green for positive delta, rose for negative.
- **`IconChip`**: Unified tinted icon chip used consistently across all card types — accepts a `tone` prop (`default | success | warning | danger | purple`) that drives both the icon colour and its deep tinted background.
- **`MiniBarChart`**: 7-bar sparkline strip used as the footer of the "Done This Week" card. Renders the last 7 days of task completion as proportional bars; today's bar is highlighted in indigo.
- **`AssetBreakdownStrip`**: Horizontal chip strip on the Asset Library card showing per-type counts (Files · Links · Logins · Plugins) each with a small tinted icon.

**Cards upgraded:**

- **`OverviewMetricCard`**: Stronger metric hierarchy (larger value, smaller label), tonal border tint per tone, hover lift (`-translate-y-[2px]` with shadow transition).
- **`OverviewProgressCard`**: Thicker progress bar (h-2.5), inline `%` label row alongside the bar.
- **`ProjectStatusStrip`**: Promoted to hero header — compact metric chips row + one faint radial glow behind the status colour dot.
- **`OverviewListCard`**: "View all" link in card header, cleaner row separators, refined icon dot sizing.
- **`PhaseBoardCard`**: Active phase gets an animated glow dot; better label weight hierarchy.

### 🔧 Changed

#### Visual System Refinement — Premium Anti-Orange Rework

Inspired by the `data-sets.css` colour direction. Full design-token pass across all dashboard components.

**Surface & border system:**

| Token            | Before            | After                                |
| ---------------- | ----------------- | ------------------------------------ |
| Card background  | `#191A22`         | `#13151e` (deeper ink)               |
| Card border      | `#292B38`         | `#1e2130` (cool graphite)            |
| Hover background | `#15161D`         | `#171929`                            |
| Label text       | `text-muted/70`   | `#6b7485` (calm slate)               |
| Helper text      | `text-muted`      | `#50566a`                            |
| Metric value     | `text-foreground` | `rgba(255,255,255,0.88)` (off-white) |

**Tone colours refined:**

| Tone                           | Old accent              | New accent                 | Change                             |
| ------------------------------ | ----------------------- | -------------------------- | ---------------------------------- |
| warning (In Progress, At Risk) | `#f97316` (loud orange) | `#d4a84b` (warm bronze)    | Orange replaced with refined amber |
| success                        | `#22c55e` (lime)        | `#4ade80` (soft emerald)   | More restrained green              |
| danger                         | `text-red-400`          | `#f87171` / `bg-[#28141a]` | Softer, deeper rose                |
| purple                         | `#a855f7` (candy)       | `#a78bfa` (soft violet)    | Less saturated                     |
| default                        | primary teal            | `#7aa3c2` (slate-blue)     | Cooler, editorial                  |

**Icon chip backgrounds per tone:**

- `default` → `bg-[#1e2638]` slate-blue
- `success` → `bg-[#162820]` deep emerald
- `warning` → `bg-[#231c10]` deep amber
- `danger` → `bg-[#28141a]` deep rose
- `purple` → `bg-[#1c1730]` deep violet

**`ProjectOverviewPage.tsx` changes:**

- "Done This Week" card: `MiniBarChart` footer + `TrendBadge` on the metric value.
- Asset Library card: `AssetBreakdownStrip` + deep icon chip + richer CTA copy.
- `viewAllHref` prop added to both list cards (Upcoming Deadlines → `/tasks`, Open Tasks → `/tasks`).
- Grid and section spacing lifted to `gap-5` / `space-y-5`.

---

## [1.6.0] - 2026-03-09

### ✅ Added

#### Workspace Asset Library (2026-03-09)

- **`workspace_assets` Table**: New table stores four asset types per workspace — `file`, `link`, `login`, and `plugin`. Fields: `name`, `url`, `username`, `password`, `category`, `notes`, `file_name`, `file_size_bytes`, `file_path`, `file_mime_type`, plus standard timestamps and workspace/creator FKs.
- **`workspace-assets` Storage Bucket**: Private Supabase Storage bucket for uploaded asset files, with per-workspace folder organisation and RLS scoped to workspace members.
- **`src/api/assets.ts`**: Full CRUD API — `listWorkspaceAssets`, `createWorkspaceAsset`, `updateWorkspaceAsset`, `deleteWorkspaceAsset`, `createAssetFileUploadUrl` (signed upload URL), `createAssetFileDownloadUrl` (signed download URL), `deleteAssetFile`.
- **`AssetLibraryPage`** (`src/pages/workspace/AssetLibraryPage.tsx`): Premium grouped layout with four section cards in a 2×2 responsive grid (Files · Links · Logins · Plugins). Each card shows a header with type icon, per-type item count badge, and an inline **Add** button; an `AssetRow` list with secondary metadata, italic notes preview, and fade-in hover actions (copy URL/username/password, download for files, edit, delete); and a type-specific `SectionEmptyState` with a CTA when no items exist.
- **Hover Action Tooltips**: CSS-only `Tooltip` component using Tailwind named groups (`group/tip`) — no JS overhead.
- **Add / Edit Modal**: Shared modal with conditional field rendering per asset type (URL field for links/logins/plugins, file upload for files, username/password for logins, category & notes for all types).
- **Asset Notifications**: Four new notification types (`asset.file_added`, `asset.link_added`, `asset.login_added`, `asset.plugin_added`) and a corresponding delete type. All hooked into the existing notification system — realtime Sonner toasts and inbox rows.
- **`queryKeys.workspaceAssets(workspaceId)`**: TanStack Query key for the asset list, used for targeted invalidation after mutations.
- **Project Overview CTA**: Asset Library card on the Project Overview page replaces the Phase Board placeholder, linking to `/assets`.
- **AppShell Navigation**: `Archive` icon + **Asset Library** nav item added to the sidebar after Tasks.

### 🔧 Changed

- **`src/types/models.ts`**: Added `WorkspaceAsset` interface.
- **`src/lib/queryKeys.ts`**: Added `workspaceAssets` key factory.
- **`src/lib/notifications/notificationTypes.ts`**: Added `"asset"` entity and four asset event types.
- **`src/lib/notifications/notificationCatalog.ts`**: Four new catalog entries for asset events.
- **`src/lib/notifications/formatNotificationMessage.ts`**: Four new case blocks for asset notification copy.
- **`src/App.tsx`**: Route `{ path: "assets", element: <AssetLibraryPage /> }` added under the workspace layout.

---

## [1.5.0] - 2026-03-09

### ✅ Added

#### Inbox — Inline Comment Thread & Composer (2026-03-09)

- **`InboxCommentThread` Component**: When a selected notification is comment-related (`comment.created`, `comment.assigned`, `comment.reaction_added`), the inbox middle column now renders a full Task Activity-style comment thread instead of a simple detail card.
- **Real Comment Thread**: Loads all comments for the related task via `listComments(taskId)` + `queryKeys.taskComments(taskId)`. Actor names and avatars are resolved from workspace users. Thread scrolls to bottom on load and after posting.
- **Comment Cards**: Each comment uses the same `rounded-2xl` card style as the TaskDrawer Activity tab — actor avatar, actor name, "commented" label, relative timestamp, comment body, and a **Reply** button.
- **Reply Quoting**: Clicking Reply pre-fills the composer with a quoted excerpt (`Replying to (Mar 9): "…"`), matching the TaskDrawer reply UX exactly.
- **Inline Composer**: Sticky composer at the bottom of the middle column — current-user avatar, auto-growing textarea, `⌘↵` hint, and a **Comment** submit button. Posts via `addComment(taskId, body)`, invalidates the comments query on success, shows a Sonner error toast on failure.
- **Task ID Resolution**: Task ID is extracted from the notification payload using `normalizeNotificationPayloadV2`. Gracefully falls back to the original detail card if no task ID is resolvable.
- **Graceful Fallbacks**: Loading and error states for the comment thread; non-comment notifications continue using the existing fields-block rendering unchanged.

### 🔧 Changed

- **`AppShell` middle column**: `overflow-y-auto` moved from the outer container div into the non-comment branch so `InboxCommentThread` can manage its own internal scroll + sticky composer layout.
- **Comment detection**: Generalised from `type === "comment.created"` to a `COMMENT_NOTIFICATION_TYPES` Set covering all three comment event types.

---

## [1.4.0] - 2026-03-09

### ✅ Added

#### TaskTable — Inline Editing (2026-03-09)

- **Inline Status Editing**: Clicking a task's status pill in the table opens a popover listing all statuses. Selecting one immediately saves via `updateTask` and refetches. Works for both parent tasks and subtasks.
- **Inline Due Date Editing**: Clicking a task's due date (or the "No date" placeholder) opens a calendar popover. Selecting a date or clearing it saves immediately. Date cell retains the existing overdue colouring.
- **Inline Priority Editing**: A new **Priority** column shows the task's current priority (Low / Medium / High / Urgent) with colour-coded dots. Clicking opens a popover picker that saves on selection.
- **Status Picker Colour Parity**: Status option dots in the inline picker exactly match the colours used by the row status pills — Todo (yellow), Upcoming (indigo), In Progress (orange), In Review (pink), Awaiting Client (violet), On Hold (gray), Complete (green), Cancelled (muted gray).
- **Stop-Propagation on Edit Cells**: All inline edit cells call `e.stopPropagation()` so clicking them does not open the task drawer.

### 🔧 Changed

- **`TaskTable`**: Added `Priority` column between assignee and progress. Status, due date, and priority cells are now interactive wrappers instead of static displays.

---

## [1.3.0] - 2026-03-09

### ✅ Added

#### Inbox — Date Grouping & Hover Quick Actions (2026-03-09)

- **Inbox Date Grouping**: Notification list now grouped into **Today**, **Yesterday**, and **Earlier** sections using calendar-day comparison (`toDateString()`). Sticky section headers keep context as the user scrolls.
- **Hover Quick Actions**: Each inbox row now reveals three inline action buttons on hover (or when the row is active):
  - **Mark as read** (`CheckCircle2`) — shown when the notification is unread
  - **Mark as unread** (`MailOpen`) — shown when the notification is already read
  - **Delete** (`Trash2`) — always shown; destructive hover colour (`#E05C5C`)
  - Timestamp fades out and action buttons fade in on hover; both use CSS opacity transitions. Each button calls `e.stopPropagation()` to avoid triggering row selection.
- **`markNotificationUnread` API function** (`src/api/notifications.ts`): Sets `read_at = null` on a notification row, making it unread again. Exported from `src/api/index.ts` with the standard `isDemoMode` fork.
- **`unreadMutation`** in `AppShell`: TanStack Query mutation wired to `markNotificationUnread`; invalidates both `notifications` and `unreadNotifications` query keys on success.

### 🔧 Changed

- **`InboxListItem`**: Refactored from `<button>` to `<div role="button">` to allow nested interactive elements (the quick-action buttons). Added `group` Tailwind class for coordinated hover state across children.
- **Inbox grouping logic**: Replaced the previous rolling 24-hour window with calendar-day `toDateString()` comparison and added a `yesterday` bucket. `groupedInboxItems` memo now returns `{ today, yesterday, earlier }`.

### 🐛 Fixed

- **Build error**: Removed unused `NOTIF_ICON_MAP`, `getNotifIcon`, `ComponentType` import, and stale Lucide icon imports (`Bell`, `Calendar`, `FileText`, `Flag`, `Mail`, `Paperclip`, `PlusCircle`, `UserPlus`) that were only referenced by the deleted icon map. Resolves `TS6133` declared-but-never-read error.

---

## [1.2.0] - 2026-03-09

### ✅ Added

#### Notification System — Actor-First Formatting & Inbox Avatar UI (2026-03-09)

- **Centralized Notification Formatter** (`src/lib/notifications/formatNotificationMessage.ts`): Single source of truth for all notification copy. Covers all 39 notification types with actor-first, event-specific language — e.g. `Levon changed "New Task"` with description `Todo → Upcoming`. Powers inbox list rows, inbox detail view, and Sonner realtime toasts.
- **Actor Avatar in Inbox List**: Each inbox row now displays the actor's user avatar (32 px circle) on the left instead of a generic type icon. Falls back to initials when no avatar URL is present.
- **`getInitials()` Utility**: Added to `src/lib/utils.ts` — splits on whitespace and takes up to two initials; returns `?` for missing names.
- **`Avatar` UI Component** (`src/components/ui/avatar.tsx`): Reusable avatar with image/initials fallback, dark-theme border and background.
- **Sonner Toast Integration** (`src/lib/toast.ts`, `src/main.tsx`): Global `<Toaster>` mounted at app root. `notify.*` helper wraps Sonner for success, error, info, loading and promise toasts.
- **Realtime Notifications Hook** (`src/hooks/useRealtimeNotifications.ts`): Supabase Realtime subscription on `public.notifications` INSERT for the current user. Invalidates inbox and unread-count queries; shows selective Sonner toasts for high-signal events only. Skips toast when the acting user is the current user.

### 🔧 Changed

- **`mapNotificationToToast`**: Refactored to delegate entirely to `formatNotificationMessage` — removes the old `formatNotification` + `normalizeNotificationPayloadV2` call chain.
- **`InboxListItem`**: Replaced type-icon badge with actor avatar (image or initials circle). Subtitle field replaced by `description` — shows the change detail or comment preview directly beneath the title.
- **`renderInboxMessage` in AppShell**: Now a thin wrapper over `formatNotificationMessage`; all copy logic removed from the component.
- **Inbox detail pane**: Reads `message.description` directly instead of parsing `--` delimited subtitles with a regex. Change/Detail label determined by event type.

---

## [1.1.0] - 2026-03-09

### ✅ Added

#### Role-Based Access & Admin Tools (2026-03-09)

- **Role-Based Sidebar**: Admin menu section (Clients, Time, Reports, Settings) now hidden from non-admin users — only visible to workspace admins
- **Admin Invite Role Toggle**: Invite modal has Client / Admin toggle buttons. When Admin is selected, the workspace picker is hidden and replaced with a note ("Admin will have access to all workspaces automatically")
- **Admin Invites Assigned to All Workspaces**: When inviting a user as Admin, the `invite-client` Edge Function now fetches all workspaces and upserts membership for every one with `role: "admin"` — applies to both email and magic-link delivery modes
- **Admins Section in Clients Table**: Clients page now shows a dedicated "Admins" section header at the top of the user table (flat list, no workspace grouping), followed by workspace-grouped client rows below
- **Role Returned by Admin Users EF**: The `admin-users` list action now selects `role` from `workspace_users`, computes each user's effective role (admin if admin in any workspace), and returns it in the user object — enabling the Admins section and future role-based display
- **Delete Workspace (Danger Zone)**: Settings page now has a Danger Zone section (admin only) with a confirmed-delete flow — user must type the workspace name to enable the button; on confirm, all memberships are removed and the workspace is deleted, then the user is redirected to workspace select
- **`delete_workspace` Edge Function Action**: New action added to `admin-users` EF — deletes all `workspace_users` memberships then deletes the workspace row

#### UI & Workflow Improvements (2026-03-09)

- **Edit Client Workspace Assignment**: Checking/unchecking workspaces in the Edit Client modal now correctly adds or removes the user from those workspaces via the Edge Function — previously workspace changes were silently ignored
- **Task Title Attachment Indicator**: Paperclip icon and file count now display inline with the task title instead of stacked below it
- **Settings Page Refactor**: Full admin-only settings screen with structured sections (Workspace Details, Client Access, Workspace Management, Support Buckets), polished form layouts, labeled fields, progress bars on bucket rows, and a clean restricted-access state for non-admins
- **Preferences → Profile Edit Modal**: Profile dropdown "Preferences" now opens a full profile edit modal (avatar upload, first name, surname, password change) instead of navigating to Settings
- **Admin-Only Profile Menu Items**: "Workspace settings" and "Invite and manage members" in the profile dropdown are now hidden for non-admin users
- **Profile Modal Style**: ProfileEditModal rebuilt to match NewTaskModal visual language (dark container, labeled fields, footer with primary/secondary actions)
- **Project Overview Dashboard**: Full advanced project overview page with Status Strip, KPI cards, Operational cards, Phase Board, Recent Activity, and Focus This Week — all derived from real task data
- **Dark Mode Default**: App now loads in dark mode by default for all new users
- **Project Overview as Default Route**: Landing page on workspace load is now Project Overview instead of Dashboard
- **Dashboard Removed from Nav**: Sidebar Dashboard item removed; Project Overview promoted to top of nav above Inbox
- **Workspace Name in Status Strip**: Project Overview status strip fetches and displays the real workspace name instead of a hardcoded value
- **First Name + Surname in Dropdowns**: Owner and Assignee dropdowns in TaskDrawer and New Task Modal now show full names (first name + surname) instead of email-derived usernames
- **Linear-style 3-Pane Inbox**: Full inbox refactor with Today/Earlier grouping, dense notification list, task-drawer-style middle detail panel, and properties rail on the right
- **TaskDrawer Activity Timeline**: Unified comment + activity feed with message-bubble comments and de-emphasised field-change rows, pinned composer at bottom
- **5-Column Task Table**: Dedicated Progress column added alongside Status, Owner, Assignee, Due Date
- **Subtask Support**: Full parent/subtask hierarchy with subtask management inside TaskDrawer
- **File Attachments**: Per-task file upload, download, and delete via Supabase Storage
- **Workspace Breadcrumb in TaskDrawer**: Full breadcrumb (workspace → parent task → subtask) displayed in drawer header

### 🔧 Changed

- **Avatar Upload Fix**: Upload path changed from flat `uid-timestamp.ext` to `uid/timestamp.ext` to satisfy Supabase Storage RLS folder-ownership policy

### 🔐 Security Improvements

- **Edge Function Auth Fix**: Re-deployed `admin-users` with `--no-verify-jwt` to prevent Supabase gateway rejecting ES256 tokens before the function's own auth handling runs

### 🗑️ Removed

- `src/components/notifications/NotificationBell.tsx`: Dead code, never imported
- `src/components/dashboard/MicroStatsRow.tsx`: Dead code, never imported
- `supabase/migrations/`: Removed from public repo (contains environment-specific SQL)
- `design/`: Design export assets removed from repo (38MB+)
- `.history/`, `.netlify/`, `supabase/.temp/`: Noise directories removed from tracking

---

## [1.0.0-beta] - 2026-03-05

### ✅ Added

#### TaskDrawer UI Enhancements (2026-03-05)

- **Right-side sticky navigation pill**: Three icon buttons (Task/Activity/Files) with hover tooltips
- **Full-width header**: Updated with bottom border for visual separation
- **Activity tab restructure**:
  - Unified feed combining activity entries and comments
  - Activity entries de-emphasized to compact single-line display
  - Comments elevated as prominent white cards with rounded corners
  - Always-visible quick templates (Snag, Needs changes, Approved ✅, Question)
  - Pinned bottom composer with Input field and Send button
- **Files tab**: Footer-aligned upload button with border separator
- **Drawer overlay**: Force margin-top: 0 to prevent layout shifts
- **CSS improvements**: Smooth transitions and responsive layout

#### Feature Additions (2026-03-04 to 2026-03-05)

- **Project Overview Unification**: Merged Micro Stats and Support Hours into single premium section
- **Unified Data State System**: Reusable DataStateWrapper with Empty/Error states and skeletons across all workspace pages
- **Admin Workspace Creation**: Settings UI to create additional named workspaces with auto-assignment
- **Sidebar Workspace Switcher**: Conditional switcher when admin belongs to multiple workspaces
- **Web Push Notifications**: Browser notification permission + toast + browser alerts for new notifications
- **Mark All Notifications Read**: Bulk action with optimized database query
- **Notification Panel Redesign**: Filter tabs (All/Unread/Mentions/Task), improved layout, time-ago formatting
- **Support Hours Top Up**: Modal with live cost calculator (R715/hour ex VAT + 15% VAT)
- **Admin Client Management**: Edit profiles (email/name/avatar), delete users with backend safeguards
- **Client Avatar Upload**: Direct avatar file upload to Supabase Storage in profile edit modal
- **Task Owner/Assignee Dropdowns**: Select from workspace users; owner auto-assigned to creator; admins edit both fields, clients edit assignee only
- **Enhanced Task Tables**: Display owner/assignee avatars with email hover tooltips, due-date color coding (green/yellow/red status)
- **File Attachment Support**: Upload/download/delete task files with storage path management
- **Invite Flow Enhancements**:
  - Bearer token authentication for Edge Functions
  - Magic link generation option
  - First/surname persistence fix across email and magic-link paths
  - Rate limit handling with `429` error messaging
- **Centralized Auth Helper**: `invokeAuthedFunction` with automatic session refresh (30-second buffer)
- **Database RPC Function**: `get_workspace_users_with_emails` for task assignment dropdowns with avatars
- **Auto Sign-up**: Email/password sign-up with automatic client workspace assignment via trigger
- **Task CRUD Workflow**: Create with draft mode, edit with explicit Save/Cancel, delete with `DELETE` confirmation and FK-safe dependency cleanup
- **Permission-Based Features**:
  - Clients cannot see timer controls (Tasks page, Time page, header widget)
  - Clients cannot edit task owner field
  - Admins can preview "Client view" without changing permissions
- **Improved Loading States**: Minimum skeleton delay, non-blocking fetch indicator, consistent across all pages
- **Authentication**: Centralized session refresh, local dev bypass mode, production JWT verification

### 🔧 Changed

#### UI/UX Improvements

- **Color Scheme**: Background #F7F8FB (soft blue-gray), Primary #78A3B0 (soft teal), Accent #487988
- **Border Radius**: Sharper modern aesthetic (xl: 0.3rem, 2xl: 0.5rem)
- **Branding**: Updated logo assets and favicon
- **Default Avatar**: Unified fallback image across all user displays
- **Header Layout**: Top-bar redesign with welcome block left, search/notification/profile actions right
- **Sidebar**: Removed role-view toggle; workspace switcher added above Settings
- **Typography**: Inter font for improved consistency
- **Card Styling**: Consistent surface utilities and focus ring patterns

#### Architecture & Code Quality

- **Supabase Edge Functions**: Disabled "Verify JWT with legacy secret"; functions now handle verification in code
- **Auth Standardization**: Removed manual Authorization headers; centralized through `invokeAuthedFunction`
- **TypeScript Cleanup**: Removed unused symbols (TS6133); project builds cleanly with 0 errors
- **Demo Mode Improvements**: In-memory data fallbacks; isolated from live Supabase calls

### 🚀 Deployment

- **Netlify CLI Setup**: Configured `netlify.toml` with build/publish settings and SPA redirect rules
- **Production Build**: Vite build outputs to `/dist` with optimized asset sizes (CSS 29.80KB gzipped, JS 666.95KB gzipped)
- **Environment Configuration**: Production Supabase URL and anon key configured in Netlify dashboard
- **Current Deployment**: `https://bpc-project-manager.netlify.app` (published 2026-03-05)

### 📋 Database Changes

#### New Functions

```sql
-- Fetch workspace users with avatars for task assignment
CREATE FUNCTION get_workspace_users_with_emails(workspace_id_param UUID)
RETURNS TABLE (user_id UUID, email TEXT, avatar_url TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT wu.user_id, u.email::TEXT, (u.raw_user_meta_data->>'avatar_url')::TEXT
  FROM workspace_users wu
  INNER JOIN auth.users u ON u.id = wu.user_id
  WHERE wu.workspace_id = workspace_id_param
  ORDER BY u.email;
END;
$$;
```

#### New Migrations

- `20260304_get_workspace_users_with_emails.sql`: RPC function for task assignment UI
- `20260304_signup_assign_all_workspaces.sql`: Auto-assign new users to all workspaces as clients
- `20260305_avatars_bucket_rls.sql`: Storage bucket RLS for avatar uploads

#### Storage Buckets

- **avatars**: Public read, authenticated write with ownership-based RLS

### 🔐 Security Improvements

- **RLS Policies**: Storage policies enforce user ownership checks for avatar uploads
- **Session Refresh**: Automatic JWT refresh before expiration (30-second buffer)
- **Backend Safeguards**: Self-delete prevention, workspace membership cleanup on user deletion
- **Workspace Scoping**: All queries isolated to user's workspace membership
- **Token Verification**: Moved from Supabase-enforced to application-level verification

### ✨ Components Added/Modified

#### New Components

- `src/components/ui/DataStateWrapper.tsx`: Reusable data state wrapper with Empty/Error/Loading
- `src/components/ui/EmptyState.tsx`: Consistent empty state UI
- `src/components/ui/ErrorState.tsx`: Consistent error state UI
- `src/components/skeletons/DashboardSkeleton.tsx`
- `src/components/skeletons/TasksSkeleton.tsx`
- `src/components/skeletons/TimeSkeleton.tsx`
- `src/components/skeletons/ReportsSkeleton.tsx`
- `src/components/skeletons/SettingsSkeleton.tsx`
- `src/hooks/useNotificationPermission.ts`: Browser notification permission management
- `src/hooks/useWebPushNotifications.ts`: Web Push notification integration
- `src/lib/invokeAuthedFunction.ts`: Centralized Edge Function auth helper

#### Modified Components

- `src/components/tasks/TaskDrawer.tsx`: Major redesign with nav pill, Activity tab restructure, composer improvements
- `src/components/layout/AppShell.tsx`: Header redesign, workspace switcher, fetch indicator, toast integration
- `src/components/notifications/NotificationBell.tsx`: Panel redesign with filter tabs, pulse animation
- `src/components/dashboard/MicroStatsRow.tsx`: Merged into unified Project Overview
- `src/pages/workspace/DashboardPage.tsx`: Project Overview integration, skeleton loading
- `src/pages/workspace/TasksPage.tsx`: DataStateWrapper, bulk delete, bulk task operations
- `src/pages/workspace/TimePage.tsx`: Loading states, client timer visibility restriction
- `src/pages/workspace/SettingsPage.tsx`: Workspace creation, magic link invites, auth improvements
- `src/pages/workspace/ClientsPage.tsx`: Avatar display, profile editing, bulk delete capability
- `src/components/profile/ProfileEditModal.tsx`: Avatar upload with storage path alignment
- `src/api/tasks.ts`: FK-safe delete, owner/assignee dropdowns, demo mode improvements
- `src/api/workspaces.ts`: Avatar-aware user fetching via RPC
- `src/api/notifications.ts`: Bulk mark-as-read query optimization
- `src/providers/AuthProvider.tsx`: Web Push permission request on login

### 🐛 Bug Fixes

- **Overlay Margin**: Force `!mt-0` on drawer overlay to prevent layout shifts
- **Tooltip Visibility**: Changed from opacity-based to `invisible/visible` for reliable hover behavior
- **Invite Metadata**: First/surname now persists across email and magic-link invite flows
- **Edge Function Auth**: Fixed 401 errors by disabling legacy JWT verification setting
- **Avatar Upload**: Corrected storage path format to match RLS prefix requirements
- **Task Deletion**: Added FK-safe dependency cleanup (files/comments/activity/time entries)
- **Drawer Height**: Applied `min-h-0 flex-1` to scroll regions to prevent overflow issues
- **Notification Count**: Proper calculation across filter states

### 📖 Documentation Updates

- Updated README with Feature List, Architecture, Environment Variables, Deployment Instructions
- Added Update Log table with detailed change tracking (16+ entries per session)
- Created CHANGELOG.md (this file) for comprehensive version history
- Added Storage bucket RLS policy examples
- Documented Edge Function configuration requirements

---

## File Structure Summary

```
bpc-projectmanagement/
├── src/
│   ├── api/                                 # Server state management
│   │   ├── files.ts                         # NEW: Task file operations
│   │   ├── index.ts
│   │   ├── notifications.ts                 # Enhanced: bulk mark-as-read
│   │   ├── tasks.ts                         # Enhanced: owner/assignee, FK-safe delete
│   │   ├── time.ts
│   │   └── workspaces.ts                    # Enhanced: avatar-aware users
│   ├── components/
│   │   ├── auth/
│   │   │   └── RequireAuth.tsx
│   │   ├── dashboard/
│   │   │   ├── MicroStatsRow.tsx            # Updated: merged to Project Overview
│   │   │   └── ... (new Project Overview styling)
│   │   ├── layout/
│   │   │   └── AppShell.tsx                 # Major update: header, workspace switcher, fetch indicator
│   │   ├── notifications/
│   │   │   └── NotificationBell.tsx         # Major redesign: filter tabs, pulse animation
│   │   ├── profile/
│   │   │   └── ProfileEditModal.tsx         # Enhanced: avatar upload
│   │   ├── skeletons/                       # NEW: Reusable loading skeletons
│   │   │   ├── DashboardSkeleton.tsx
│   │   │   ├── TasksSkeleton.tsx
│   │   │   ├── TimeSkeleton.tsx
│   │   │   ├── ReportsSkeleton.tsx
│   │   │   └── SettingsSkeleton.tsx
│   │   ├── tasks/
│   │   │   ├── StatusPill.tsx
│   │   │   ├── TaskDrawer.tsx               # Major redesign: nav pill, Activity restructure
│   │   │   └── TaskTable.tsx                # Enhanced: avatars, due-date color coding
│   │   ├── time/
│   │   │   └── TimerWidget.tsx
│   │   └── ui/
│   │       ├── DataStateWrapper.tsx         # NEW: Reusable data state container
│   │       ├── EmptyState.tsx               # NEW: Consistent empty state
│   │       ├── ErrorState.tsx               # NEW: Consistent error state
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       ├── skeleton.tsx
│   │       └── textarea.tsx
│   ├── hooks/
│   │   ├── useNotificationPermission.ts     # NEW: Browser notification permission
│   │   ├── useSystemStatus.ts
│   │   └── useWebPushNotifications.ts       # NEW: Web Push integration
│   ├── lib/
│   │   ├── invokeAuthedFunction.ts          # NEW: Centralized Edge Function auth
│   │   ├── queryClient.ts
│   │   ├── queryKeys.ts
│   │   ├── requireSession.ts
│   │   ├── roleView.ts
│   │   ├── supabase.ts
│   │   └── utils.ts
│   ├── pages/
│   │   ├── AuthInvitePage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── WorkspaceSelectPage.tsx
│   │   └── workspace/
│   │       ├── ClientsPage.tsx              # NEW: Admin client management
│   │       ├── DashboardPage.tsx            # Enhanced: Project Overview, skeletons
│   │       ├── ReportsPage.tsx              # Enhanced: skeletons
│   │       ├── SettingsPage.tsx             # Enhanced: workspace creation, magic links
│   │       ├── TasksPage.tsx                # Enhanced: bulk delete, skeletons
│   │       └── TimePage.tsx                 # Enhanced: client restrictions
│   ├── providers/
│   │   ├── AuthProvider.tsx                 # Enhanced: Web Push permission request
│   │   └── ToastProvider.tsx
│   ├── types/
│   │   └── models.ts                        # Enhanced: premium task fields, TaskFile type
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── supabase/
│   ├── config.toml
│   ├── seed.sql
│   ├── functions/
│   │   ├── admin-users/
│   │   │   └── index.ts                     # Enhanced: avatar upload, user verification
│   │   └── invite-client/
│   │       └── index.ts                     # Enhanced: magic link generation, rate limit handling
│   └── migrations/
│       ├── 20260304_get_workspace_users_with_emails.sql   # NEW
│       ├── 20260304_signup_assign_all_workspaces.sql      # NEW
│       ├── 20260304180000_tasks_fields_and_uploads.sql
│       ├── 20260305034056_seed_tasks_prod_20260305.sql
│       └── 20260305113000_avatars_bucket_rls.sql          # NEW
├── public/
│   ├── BPC-Logo.jpg                         # NEW: Updated branding
│   ├── bpc-logo.svg
│   └── defaultAvatar.png                    # NEW: Unified fallback avatar
├── scripts/
│   ├── reset-support-hours-prod.mjs
│   └── set-admin-avatar-prod.mjs
├── CHANGELOG.md                             # NEW: This file
├── README.md                                # Enhanced: documentation
├── netlify.toml                             # NEW: Deployment config
├── tailwind.config.ts                       # Enhanced: color scheme refinement
├── package.json                             # Includes all dependencies
└── ... (config files)
```

---

## Known Limitations & Roadmap

### Current Limitations

- **High-impact Activity UI enhancements**: Detailed design spec pending implementation (message bubbles, sticky composer styling, chip-style quick templates)
- **Notification DB triggers**: Currently client-side event writes; DB triggers planned for V1.1
- **Reporting**: Basic task/hours views; richer filtering, date ranges, and exports planned for V1.1+
- **Audit trail**: Activity logged but full diff views not yet implemented
- **Integrations**: Slack/email/webhooks planned for V2

### V1.1 Roadmap (Next)

- [ ] Implement high-impact Activity tab UI enhancements
- [ ] Deploy latest build to Netlify production
- [ ] Move notification writes to database triggers/functions
- [ ] Improve timer resilience and edge-case handling
- [ ] Add richer filtering/sorting on tasks and reports

### V1.2 Roadmap (After V1.1)

- [ ] CSV/PDF exports for reports
- [ ] Workspace/member admin controls
- [ ] Improved activity timelines and audit detail

### V2 Roadmap (Long-term)

- [ ] Billing/retainer invoicing support
- [ ] Slack/email/webhook integrations
- [ ] Advanced analytics and SLA dashboards

---

## Contributors

- Broken Pony Club Engineering Team

## License

Proprietary - Broken Pony Club. See LICENSE file for details.
