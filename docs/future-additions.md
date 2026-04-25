# Future Additions

Planned features and enhancements not yet implemented.

---

## Settings — Notifications Tab

**Location:** `components/creative.tsx` → Settings → Notifications tab (`value="notifications"`)

**Goal:** Give users control over when and how they are alerted to project activity.

### Notification Preferences

| Preference | Trigger | Channels |
|---|---|---|
| Task status changes | Any task status update | In-app, Email |
| Due date reminders | X days before task due date | In-app, Email |
| Project updates | Project name / description / progress edited | In-app, Email |
| New task assigned | Task created in a project you're a member of | In-app, Email |

### Supabase Schema Required

```sql
-- Per-user notification preferences
CREATE TABLE public.notification_preferences (
  user_id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  task_status    BOOLEAN DEFAULT true,
  due_reminders  BOOLEAN DEFAULT true,
  due_reminder_days INT DEFAULT 2,   -- how many days before due date
  project_updates BOOLEAN DEFAULT true,
  channel_inapp  BOOLEAN DEFAULT true,
  channel_email  BOOLEAN DEFAULT false,
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
```

### UI Requirements

- Toggle switches (shadcn `Switch`) per preference category
- Email toggle disabled with tooltip if user has no verified email
- Due date reminder: numeric input for "X days before"
- Save button with toast confirmation (top-right, sonner)
- Read preferences on settings page load via `supabase.from('notification_preferences').select()`

### Notes

- Email delivery requires an email provider (Resend / SendGrid) wired to Supabase Edge Functions or a Next.js API route
- In-app notifications can use the existing `notifications` state in `DesignaliCreative` or a real `notifications` table
- This feature depends on the roles system (`profiles` table) being stable first

---
