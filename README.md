# BPC Project Manager

A multi-workspace project management and client portal built for support agencies. Premium dark UI inspired by Linear, backed by Supabase.

**Version:** 2.1.0 — 30 March 2026

**Tech stack:** React Router 7 · Vite · TypeScript · Supabase · TanStack Query · Tailwind CSS v4 · shadcn/ui

**Live demo:** [bpc-project-manager.netlify.app](https://bpc-project-manager.netlify.app)

---

## Features

- **Multi-workspace** — each client maps to a workspace with its own tasks, team and support bucket
- **Project Overview** — premium real-time dashboard: hero status strip with radial glow, KPI metric cards with trend badges, 7-bar sparkline, progress cards with inline % labels, phase board with active-phase glow dot, activity feed, and an editorial dark-ink visual system (no orange)
- **Task Management** — subtasks, inline status / due date / priority editing (ClickUp-style popovers), file attachments, due date colouring, drawer with full activity history; Owner and Assigned To display full names with avatar images in activity feed
- **Time Tracking** — start/stop timers per task, view time reports
- **Support Buckets** — allocated vs used hours with progress bar
- **Inbox** — Linear-style 3-pane notification inbox with date-grouped notifications (Today / Yesterday / Earlier), actor avatars, actor-first message formatting, per-row hover quick actions (mark read/unread, delete), and an inline comment thread + composer for comment notifications (reply directly from the inbox). Inbox fills full viewport height below the sticky header using a flex-child layout (no absolute positioning).
- **User Presence** — Online status indicators and last-seen timestamps on the Users page; green dot + "Online" for users active in the last 5 minutes, gray dot + relative timestamp ("2 min ago", "1 hour ago") for offline users; workspace-scoped, inferred from last sign-in
- **Admin tools** — invite users (email / magic link), manage clients, create / delete workspaces, role-based access; admin can edit any team member's profile (name + avatar) from Settings
- **User Profile** — sidebar nav avatar opens self-edit dialog: upload avatar, update name, change password; avatar hover shows camera overlay
- **Asset Library** — per-workspace repository of files, links, logins and plugins; grouped 2×2 section card layout; file upload with signed-URL download, copy-to-clipboard for links/credentials, inline notes; notifications on add/delete
- **Dark mode by default** — persisted theme preference with high-contrast light mode support

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project

### Installation

```bash
git clone https://github.com/levon-brokenponyclub/BPC-Project-Manager.git
cd BPC-Project-Manager
npm install
```

### Environment variables

Create a `.env.local` file at the project root:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Run development server

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

---

## Supabase Setup

### 1. Apply migrations

Run each SQL file in `supabase/migrations/` in chronological order via the Supabase Dashboard SQL editor, or use the CLI:

```bash
npx supabase db push
```

### 2. Deploy Edge Functions

```bash
npx supabase functions deploy admin-users --no-verify-jwt
npx supabase functions deploy invite-client --no-verify-jwt
npx supabase functions deploy send-email-notification --no-verify-jwt
```

> Deploy all functions with `--no-verify-jwt`. They perform their own JWT verification via the service role key.

### 3. Edge Function environment variables

Set the following in your Supabase Dashboard → **Edge Functions**:

| Variable                    | Description                               |
| --------------------------- | ----------------------------------------- |
| `SUPABASE_URL`              | Your Supabase project URL                 |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (never expose to client) |
| `SUPABASE_ANON_KEY`         | Anon/public key                           |
| `APP_BASE_URL`              | Full URL of your deployed frontend        |

### 4. Storage buckets

Create two buckets in **Storage → New bucket**:

| Bucket             | Public |
| ------------------ | ------ |
| `avatars`          | Yes    |
| `task-files`       | No     |
| `workspace-assets` | No     |

### 5. Bootstrap seed (optional)

`supabase/seed.sql` creates an initial admin workspace. Update the hardcoded UUIDs and email address to match your own Supabase auth user before running.

---

## Project Structure

```
src/
├── api/           # Supabase query functions (tasks, time, clients…)
├── components/
│   ├── auth/      # Route guards
│   ├── dashboard/ # Project overview cards
│   ├── layout/    # AppShell (sidebar, nav, profile menu)
│   ├── profile/   # Profile edit modal + avatar upload
│   ├── skeletons/ # Page-level loading states
│   ├── tasks/     # Task table, drawer, modal, status pill
│   ├── time/      # Timer widget
│   └── ui/        # Primitive components (button, card, input…)
├── demo/          # Demo mode mock data
├── hooks/         # Custom React hooks
├── lib/
│   ├── notifications/ # Centralized formatter, type catalog, realtime helpers
│   └── …              # Supabase client, TanStack Query config, utilities
├── pages/
│   └── workspace/ # Per-workspace pages
├── providers/     # Auth, Theme, Toast context providers
├── styles/        # Global CSS and design tokens
└── types/         # Shared TypeScript models

supabase/
├── functions/     # Edge Functions (admin-users, invite-client)
├── migrations/    # Database schema migrations
└── config.toml    # Supabase CLI config
```

---

## Deployment

The app builds to a static SPA (`dist/`). Deploy to any static host.

**Netlify** (recommended — `netlify.toml` included):

1. Connect the repo in Netlify
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables
3. Netlify auto-deploys on push; SPA routing is pre-configured via `netlify.toml`

---

## Role System

| Role     | Access                                                                |
| -------- | --------------------------------------------------------------------- |
| `admin`  | Full access — all pages, task editing, time tracking, user management |
| `client` | Restricted — Project Overview, Tasks (read-only), Inbox               |

Roles are stored in `workspace_users.role`.

---

## Database Overview

| Table              | Purpose                           |
| ------------------ | --------------------------------- |
| `workspaces`       | Tenant organisations              |
| `workspace_users`  | Membership and role per workspace |
| `tasks`            | Task and subtask records          |
| `comments`         | Task comments                     |
| `task_activity`    | Field-change audit log            |
| `time_entries`     | Timer records                     |
| `support_buckets`  | Prepaid hour allocations          |
| `notifications`    | In-app notification records       |
| `workspace_assets` | Files, links, logins and plugins  |

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

## UI Refactor Guides

Shadcn migration planning docs are available in:

- [docs/shadcn-refactor/01-phased-project-plan.md](docs/shadcn-refactor/01-phased-project-plan.md)
- [docs/shadcn-refactor/02-action-items-checklist.md](docs/shadcn-refactor/02-action-items-checklist.md)
- [docs/shadcn-refactor/03-component-mapping-and-guides.md](docs/shadcn-refactor/03-component-mapping-and-guides.md)
- [docs/shadcn-refactor/04-sprint-plan.md](docs/shadcn-refactor/04-sprint-plan.md)
- [docs/shadcn-refactor/05-phase1-component-migration-matrix.md](docs/shadcn-refactor/05-phase1-component-migration-matrix.md)
- [docs/shadcn-refactor/06-v2-parallel-build-plan.md](docs/shadcn-refactor/06-v2-parallel-build-plan.md)
- [docs/shadcn-refactor/07-cli-prompt-answer-sheet.md](docs/shadcn-refactor/07-cli-prompt-answer-sheet.md)
- [docs/shadcn-refactor/08-v2-route-map-and-folder-structure.md](docs/shadcn-refactor/08-v2-route-map-and-folder-structure.md)

---

## License

Private — © Broken Pony Club. All rights reserved.
