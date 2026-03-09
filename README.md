# BPC Project Manager

A multi-workspace project management and client portal built for support agencies. Premium dark UI inspired by Linear, backed by Supabase.

**Tech stack:** React · Vite · TypeScript · Supabase · TanStack Query · Tailwind CSS

**Live demo:** [bpc-project-manager.netlify.app](https://bpc-project-manager.netlify.app)

---

## Features

- **Multi-workspace** — each client maps to a workspace with its own tasks, team and support bucket
- **Project Overview** — real-time health dashboard (KPI cards, phase board, activity feed)
- **Task Management** — subtasks, inline status / due date / priority editing (ClickUp-style popovers), file attachments, due date colouring, drawer with full activity history
- **Time Tracking** — start/stop timers per task, view time reports
- **Support Buckets** — allocated vs used hours with progress bar
- **Inbox** — Linear-style 3-pane notification inbox with date-grouped notifications (Today / Yesterday / Earlier), actor avatars, actor-first message formatting, per-row hover quick actions (mark read/unread, delete), and an inline comment thread + composer for comment notifications (reply directly from the inbox)
- **Admin tools** — invite users (email / magic link), manage clients, create / delete workspaces, role-based access
- **Dark mode default** — persisted theme preference

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
```

> Deploy both functions with `--no-verify-jwt`. They perform their own JWT verification via the service role key.

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

| Bucket       | Public |
| ------------ | ------ |
| `avatars`    | Yes    |
| `task-files` | No     |

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

| Table             | Purpose                           |
| ----------------- | --------------------------------- |
| `workspaces`      | Tenant organisations              |
| `workspace_users` | Membership and role per workspace |
| `tasks`           | Task and subtask records          |
| `comments`        | Task comments                     |
| `task_activity`   | Field-change audit log            |
| `time_entries`    | Timer records                     |
| `support_buckets` | Prepaid hour allocations          |
| `notifications`   | In-app notification records       |

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

## License

Private — © Broken Pony Club. All rights reserved.
