# BPC Project Management — V2

V2 is a full rebuild of the BPC Client Portal using React Router 7, shadcn/ui, TailwindCSS v4, and Supabase. It replaces the legacy V1 React SPA with a modern, role-aware, multi-workspace platform.

---

## Tech Stack

| Layer     | Technology                           |
| --------- | ------------------------------------ |
| Framework | React Router 7 (client loaders)      |
| UI        | shadcn/ui + Radix UI                 |
| Styling   | TailwindCSS v4                       |
| Icons     | Tabler Icons + Lucide                |
| Tables    | TanStack React Table v8              |
| Charts    | Recharts                             |
| Database  | Supabase (Postgres + RLS)            |
| Auth      | Supabase Auth                        |
| Realtime  | Supabase Realtime (postgres_changes) |
| Deploy    | Netlify (via Dockerfile)             |

---

## Roles

| Role     | Access                                             |
| -------- | -------------------------------------------------- |
| `admin`  | Full access — all pages, settings, role management |
| `member` | Full access — all pages except Settings            |
| `client` | Full access — all pages except Settings            |
| `viewer` | Sprint Dashboard only — all other routes redirect  |

---

## Routes

| Route                 | Description                                                 |
| --------------------- | ----------------------------------------------------------- |
| `/`                   | Home dashboard                                              |
| `/tasks`              | Task list with status grouping, filtering, and detail panel |
| `/tasks?parent=<id>`  | Tasks filtered by workstream parent                         |
| `/projects`           | Project list                                                |
| `/inbox`              | Messages inbox                                              |
| `/inbox?box=sent`     | Sent messages                                               |
| `/inbox?box=pinned`   | Pinned messages                                             |
| `/inbox?box=archived` | Archived messages                                           |
| `/activity`           | Activity feed                                               |
| `/settings`           | Team management and member invites (admin only)             |
| `/sprint-dashboard`   | APAC sprint KPI dashboard                                   |
| `/login`              | Auth                                                        |
| `/auth/invite`        | Invite acceptance                                           |
| `/workspace`          | Workspace selector                                          |

All routes accept a `?ws=<workspace_id>` query param for workspace scoping.

---

## Key Features

### Tasks

- Grouped by status (Todo / In Progress / etc.) — expanded by default
- Default sort: Date Added descending
- Show/hide completed tasks — hidden by default
- Filter by workstream via `?parent=<task_id>`
- Task detail side panel with editable fields, description with hyperlink rendering, subtasks, and files
- Delete task with cascade on subtasks

### Inbox

- Received messages with unread state tracking
- Sent mailbox view
- Pinned mailbox view
- Archived mailbox view
- Per-message actions: Pin / Unpin, Archive / Move to Inbox, Delete
- Thread view with reply composer
- Realtime updates via Supabase channel

### Sprint Dashboard

- APAC Web Fonts Compliance Remediation sprint
- KPI cards: total tasks, complete, in-progress, blocked
- Progress bar with completion percentage
- Tasks by status chart
- Tasks by priority chart

### Settings

- Left-tab layout: Team / Invite
- Role management with draft + Save/Cancel per member
- Magic-link invite via Supabase Edge Function
- Roles supported: `admin`, `member`, `client`, `viewer`

---

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Typecheck

```bash
npm run typecheck
```

## Adding shadcn components

```bash
npx shadcn@latest add <component>
```

---

## Environment Variables

Create a `.env` file in `v2/` with:

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
```

---

## Supabase

Migrations live in `/supabase/migrations/`. To run locally:

```bash
supabase db push
```

Edge Functions live in `/supabase/functions/`. Deploy with:

```bash
supabase functions deploy <function-name>
```
