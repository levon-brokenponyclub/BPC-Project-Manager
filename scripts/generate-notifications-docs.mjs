#!/usr/bin/env node
/**
 * generate-notifications-docs.mjs
 *
 * Scans the real codebase and generates docs/notifications.md automatically.
 *
 * Run:
 *   npm run docs:notifications
 *
 * Sources scanned:
 *   src/lib/notifications/notificationTypes.ts    — master type list + payload shape
 *   src/lib/notifications/notificationCatalog.ts  — label / icon / entity per type
 *   src/lib/notifications/formatNotificationMessage.ts — switch cases → title format
 *   src/lib/notifications/mapNotificationToToast.ts    — Sonner allow-list
 *   src/hooks/useRealtimeNotifications.ts               — realtime flow
 *   src/lib/browserNotifications.ts                    — localStorage keys/flags
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

// ---------------------------------------------------------------------------
// 1.  Extract master notification type list from notificationTypes.ts
// ---------------------------------------------------------------------------
const typesSource = read("src/lib/notifications/notificationTypes.ts");

const ALL_TYPES = [];
{
  const listMatch = typesSource.match(
    /export const notificationTypes\s*=\s*\[([\s\S]*?)\]\s*as const/,
  );
  if (!listMatch) throw new Error("Could not parse notificationTypes array");
  const raw = listMatch[1];
  for (const m of raw.matchAll(/"([^"]+)"/g)) {
    ALL_TYPES.push(m[1]);
  }
}

// ---------------------------------------------------------------------------
// 2.  Extract Sonner allow-list from mapNotificationToToast.ts
// ---------------------------------------------------------------------------
const toastSource = read("src/lib/notifications/mapNotificationToToast.ts");

const SONNER_SET = new Set();
{
  const setMatch = toastSource.match(
    /const REALTIME_TOAST_TYPES\s*=\s*new Set\(\[([\s\S]*?)\]\)/,
  );
  if (setMatch) {
    for (const m of setMatch[1].matchAll(/"([^"]+)"/g)) {
      SONNER_SET.add(m[1]);
    }
  }
}

// browser notifications share the same allow-list (same gate: mapNotificationToToast)
const BROWSER_SET = SONNER_SET;

// ---------------------------------------------------------------------------
// 3.  Extract per-type formatter patterns from formatNotificationMessage.ts
// ---------------------------------------------------------------------------
const fmtSource = read("src/lib/notifications/formatNotificationMessage.ts");

/**
 * For each notification type, try to extract the title template string from
 * the switch-case block.  Enhanced to handle multi-line templates and ternaries.
 */
function extractTitleTemplate(type) {
  // Match:  case "type.name": { title = `...`; ... }
  const escaped = type.replace(".", "\\.");
  const re = new RegExp(
    `case\\s+"${escaped}":\\s*\\{([\\s\\S]*?)(?=case\\s+"|default:|\\}\\s*$)`,
    "m",
  );
  const m = fmtSource.match(re);
  if (!m) return null;
  const body = m[1];

  // Try to find title assignment — handle multiple patterns:
  // 1. title = `simple template`;
  // 2. title = actor + " did " + `something`;
  // 3. title = ternary ? `option1` : `option2`;
  // 4. Multi-line templates with ${...} interpolations
  // 5. Nested template literals like ${cond ? `inner` : ""}

  // First, find the title assignment line(s)
  const titleAssignMatch = body.match(/title\s*=\s*([^;]+);/s);
  if (!titleAssignMatch) return null;
  const assignment = titleAssignMatch[1].trim();

  // Find the main template literal by tracking ${ } depth
  const firstBacktick = assignment.indexOf("`");
  if (firstBacktick === -1) return "—";

  let i = firstBacktick + 1;
  let braceDepth = 0; // Tracks ${ } nesting depth

  while (i < assignment.length) {
    const char = assignment[i];
    const prev = assignment[i - 1];

    if (char === "{" && prev === "$") {
      braceDepth++;
    } else if (char === "}" && braceDepth > 0) {
      braceDepth--;
    } else if (char === "`" && braceDepth === 0) {
      // Found the closing backtick at top level
      const template = assignment.substring(firstBacktick + 1, i);
      // Truncate if too long
      if (template.length > 150) {
        return template.substring(0, 147) + "...";
      }
      return template;
    }
    i++;
  }

  // Fallback if we couldn't find a proper match
  return assignment.substring(0, 100).replace(/\s+/g, " ");
}

// ---------------------------------------------------------------------------
// 4.  Extract entity + label + icon info from notificationCatalog.ts
// ---------------------------------------------------------------------------
const catalogSource = read("src/lib/notifications/notificationCatalog.ts");

function extractCatalogEntry(type) {
  // createDefinition("type", "Label", "Desc", "entity", "Icon", "action"...)
  const escaped = type.replace(".", "\\.");
  const re = new RegExp(
    `createDefinition\\(\\s*"${escaped}"\\s*,\\s*"([^"]*)"\\s*,\\s*"([^"]*)"\\s*,\\s*"([^"]*)"\\s*,\\s*"([^"]*)"`,
  );
  const m = catalogSource.match(re);
  if (!m) return null;
  return { label: m[1], description: m[2], entity: m[3], icon: m[4] };
}

// ---------------------------------------------------------------------------
// 5.  Infer route category from type and formatter source
// ---------------------------------------------------------------------------
function inferRoute(type) {
  // Check if the formatter has a specific route pattern for this type
  const escaped = type.replace(".", "\\.");
  const caseMatch = fmtSource.match(
    new RegExp(
      `case\\s+"${escaped}":\\s*\\{([\\s\\S]*?)(?=case\\s+"|default:|\\}\\s*$)`,
      "m",
    ),
  );

  if (caseMatch) {
    const body = caseMatch[1];
    // Look for route assignments or patterns
    if (body.includes("task_id") || body.includes("/tasks?task=")) {
      return "/w/:workspaceId/tasks?task=:taskId";
    }
    if (body.includes("asset_id") || body.includes("/assets/")) {
      return "/w/:workspaceId/assets/:assetId";
    }
    if (body.includes("settings") || body.includes("/settings")) {
      return "/w/:workspaceId/settings";
    }
    if (body.includes("clients") || body.includes("/clients")) {
      return "/w/:workspaceId/clients";
    }
  }

  // Fallback to prefix-based inference
  if (
    type.startsWith("task.") ||
    type.startsWith("comment.") ||
    type.startsWith("attachment.") ||
    type.startsWith("content.") ||
    type.startsWith("list.")
  ) {
    return "/w/:workspaceId/tasks?task=:taskId";
  }
  if (type.startsWith("asset.")) return "/w/:workspaceId/assets/:assetId";
  if (type.startsWith("workspace.")) {
    // Member events might go to settings or clients
    if (type.includes("invite") || type.includes("member")) {
      return "/w/:workspaceId/settings/members | /w/:workspaceId/clients";
    }
    return "/w/:workspaceId/settings";
  }
  if (type.startsWith("integration.")) return "n/a (email/external)";
  return "—";
}

// ---------------------------------------------------------------------------
// 6.  Determine self-action dedup behavior
// ---------------------------------------------------------------------------
function hasSelfActionDedup(type) {
  // All types go through the self-action dedup check in useRealtimeNotifications
  // The check is: if payload.actor.id === currentUserId, return early
  // This applies to all notification types
  return "yes";
}

// ---------------------------------------------------------------------------
// 7.  Determine visible tab behavior
// ---------------------------------------------------------------------------
function getVisibleTabBehavior(isSonner, isBrowser) {
  if (isSonner && isBrowser) {
    return "Visible: Sonner toast only | Hidden: Sonner + Browser notification";
  } else if (isSonner && !isBrowser) {
    return "Visible: Sonner toast only | Hidden: Sonner toast only";
  } else if (!isSonner && isBrowser) {
    // This shouldn't happen (browser requires sonner allow-list)
    return "Visible: Nothing | Hidden: Browser notification";
  } else {
    return "Visible: Nothing | Hidden: Nothing (inbox only)";
  }
}

// ---------------------------------------------------------------------------
// 8.  Detect localStorage keys from browserNotifications.ts
// ---------------------------------------------------------------------------
const browserSource = read("src/lib/browserNotifications.ts");

const LS_KEYS = [];
for (const m of browserSource.matchAll(/["'](bpc_[^"']+)["']/g)) {
  if (!LS_KEYS.includes(m[1])) LS_KEYS.push(m[1]);
}

// ---------------------------------------------------------------------------
// 9.  Build per-type metadata model
// ---------------------------------------------------------------------------
const entries = ALL_TYPES.map((type) => {
  const catalog = extractCatalogEntry(type);
  const titleTemplate = extractTitleTemplate(type);
  const isSonner = SONNER_SET.has(type);
  const isBrowser = BROWSER_SET.has(type);

  return {
    type,
    label: catalog?.label ?? type,
    entity: catalog?.entity ?? "—",
    icon: catalog?.icon ?? "—",
    inbox: true, // all types persisted to public.notifications
    sonner: isSonner,
    browser: isBrowser,
    push: "no", // not yet implemented
    route: inferRoute(type),
    titleTemplate: titleTemplate ?? "—",
    selfActionDedup: hasSelfActionDedup(type),
    visibleTabBehavior: getVisibleTabBehavior(isSonner, isBrowser),
  };
});

// ---------------------------------------------------------------------------
// 10.  Orphan analysis
// ---------------------------------------------------------------------------
const catalogMatches = new Set(
  ALL_TYPES.filter((t) => extractCatalogEntry(t) !== null),
);
const formatterMatches = new Set(
  ALL_TYPES.filter((t) => extractTitleTemplate(t) !== null),
);

const definedNotFormatted = ALL_TYPES.filter((t) => !formatterMatches.has(t));
const formattedNotInCatalog = ALL_TYPES.filter(
  (t) => formatterMatches.has(t) && !catalogMatches.has(t),
);
const sonnerNotInMasterList = [...SONNER_SET].filter(
  (t) => !ALL_TYPES.includes(t),
);

// ---------------------------------------------------------------------------
// 11.  Render Markdown
// ---------------------------------------------------------------------------
const now = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";

const yesNo = (v) =>
  v === true
    ? "✅"
    : v === "no"
      ? "❌"
      : v === "planned"
        ? "🔜 planned"
        : v === "yes"
          ? "✅"
          : "❌";

function tableRow(e) {
  return `| \`${e.type}\` | ${e.label} | ${e.entity} | ${yesNo(e.inbox)} | ${yesNo(e.sonner)} | ${yesNo(e.browser)} | ${yesNo(e.push)} | ${yesNo(e.selfActionDedup)} | \`${e.route}\` |`;
}

// Generate example rendered messages for common types
function generateExamples() {
  const examples = [
    {
      type: "task.created",
      actor: "Levon",
      entity: "New Homepage Task",
      description: null,
    },
    {
      type: "task.status_changed",
      actor: "Levon",
      entity: "New Homepage Task",
      description: "Todo → In Progress",
    },
    {
      type: "task.assignee_added",
      actor: "Levon",
      entity: "New Homepage Task",
      description: "Assigned to Sarah",
    },
    {
      type: "comment.created",
      actor: "Levon",
      entity: "Homepage Design",
      description: "This looks great! Let's ship it.",
    },
    {
      type: "attachment.added",
      actor: "Levon",
      entity: "Homepage Design",
      description: "design-mockup.fig (2.3 MB)",
    },
    {
      type: "asset.created",
      actor: "Levon",
      entity: "Brand Guidelines v2",
      description: null,
    },
    {
      type: "workspace.invite_sent",
      actor: "Levon",
      entity: "BPC Workspace",
      description: "sarah@example.com",
    },
    {
      type: "workspace.member_joined",
      actor: "Sarah Johnson",
      entity: "BPC Workspace",
      description: null,
    },
  ];

  return examples
    .map((ex) => {
      const entry = entries.find((e) => e.type === ex.type);
      if (!entry) return "";

      let rendered = `**${ex.actor}**`;
      if (ex.type === "workspace.member_joined") {
        rendered = `**${ex.actor}** joined the workspace`;
      } else if (ex.type === "task.created") {
        rendered = `**${ex.actor}** created "${ex.entity}"`;
      } else if (ex.type === "task.status_changed") {
        rendered = `**${ex.actor}** changed "${ex.entity}" → ${ex.description}`;
      } else if (ex.type === "task.assignee_added") {
        rendered = `**${ex.actor}** assigned "${ex.entity}" to ${ex.description.replace("Assigned to ", "")}`;
      } else if (ex.type === "comment.created") {
        rendered = `**${ex.actor}** commented on "${ex.entity}"\n  > ${ex.description}`;
      } else if (ex.type === "attachment.added") {
        rendered = `**${ex.actor}** uploaded a file to "${ex.entity}"\n  📎 ${ex.description}`;
      } else if (ex.type === "asset.created") {
        rendered = `**${ex.actor}** added "${ex.entity}" to the Asset Library`;
      } else if (ex.type === "workspace.invite_sent") {
        rendered = `**${ex.actor}** invited ${ex.description} to the workspace`;
      }

      return `### \`${ex.type}\`\n\n${rendered}\n\n**Delivery:** ${entry.sonner ? "Sonner toast" : "Inbox only"}${entry.browser ? " + Browser notification (if tab hidden)" : ""}\n**Route:** \`${entry.route}\``;
    })
    .join("\n\n---\n\n");
}

const md = `<!-- AUTO-GENERATED — do not edit manually -->
<!-- Generated by scripts/generate-notifications-docs.mjs on ${now} -->

# Notifications System

> ⚠️ This file is auto-generated. Run \`npm run docs:notifications\` to regenerate.

## Architecture Overview

The notification system is layered:

\`\`\`
Event occurs in the app
  → backend inserts a row into public.notifications
  → Supabase Realtime pushes INSERT event to the subscribed client
  → useRealtimeNotifications (hook) receives the event
      ├── invalidates React Query caches (inbox + unread count badge)
      ├── performs self-action dedup check (skip if user's own action)
      ├── shows a Sonner in-app toast  [if type is on the allow-list]
      └── shows a browser desktop notification  [if tab hidden + permission granted]
\`\`\`

**Persistence:** All notification rows are stored in \`public.notifications\` and
displayed in the in-app Inbox panel. The inbox is the durable notification history.

**Realtime toasts:** A subset of high-value types produce a Sonner toast via
\`mapNotificationToToast.ts\`.

**Browser desktop notifications:** Fired from \`showBrowserNotification()\` in
\`src/lib/browserNotifications.ts\`, only when \`document.visibilityState !== "visible"\`
and OS permission is granted.

**Self-action dedup:** All notification types go through self-action deduplication.
If \`payload.actor.id\` matches the current user, the realtime toast and browser
notification are suppressed (user already got feedback from their own action).

**Push notifications:** Not yet implemented.

---

## 1. Notification Types

| Type | Label | Entity | Inbox | Sonner | Browser | Push | Self-Dedup | Route |
|------|-------|--------|-------|--------|---------|------|------------|-------|
${entries.map(tableRow).join("\n")}

**Legend:**
- ✅ = active / yes
- ❌ = not active / not applicable
- 🔜 planned = not yet implemented

**Column Guide:**
- **Inbox**: Persisted to \`public.notifications\` table (always ✅ for all types)
- **Sonner**: Shows in-app toast via Sonner library (if on allow-list)
- **Browser**: Shows OS desktop notification (if tab hidden + permission granted)
- **Push**: Web push notification via service worker (not yet implemented)
- **Self-Dedup**: Whether self-action deduplication applies to realtime toast and browser notifications (✅ for all types; inbox always persists)
- **Route**: In-app navigation target when notification is clicked

---

## 2. Visible Tab Behavior

When a realtime notification arrives, behavior depends on tab visibility:

| Scenario | Sonner? | Browser? | Behavior |
|----------|---------|----------|----------|
| **Tab visible + Type on allow-list** | ✅ | ❌ | Sonner toast only |
| **Tab hidden + Type on allow-list** | ✅ | ✅ | Sonner toast + Browser notification |
| **Tab visible + Type NOT on allow-list** | ❌ | ❌ | Inbox update only |
| **Tab hidden + Type NOT on allow-list** | ❌ | ❌ | Inbox update only |

**Per-type summary:**

${entries
  .filter((e) => e.sonner || e.browser)
  .map((e) => `- \`${e.type}\`: ${e.visibleTabBehavior}`)
  .join("\n")}

---

## 3. Notification Payload Structure

All notification payloads are normalised to \`NotificationPayloadV2\` (defined in
\`src/lib/notifications/notificationTypes.ts\`) before being passed to the formatter
or displayed in the inbox.

\`\`\`ts
// src/lib/notifications/notificationTypes.ts
interface NotificationPayloadV2 {
  actor: {
    id: string | null;
    name: string | null;
    email: string | null;
    avatar_url?: string | null;
  };
  entity: {
    type: NotificationEntity;  // "task" | "comment" | "file" | "list" | "workspace" | "integration" | "asset"
    id: string | null;
    name: string | null;
  };
  target?: {
    workspace_id: string;
    task_id?: string | null;
    route?: string | null;      // in-app navigation target, e.g. /w/:id/tasks?task=...
  };
  change?: {
    field?: string;
    from?: string | null;
    to?: string | null;
  };
  meta?: Record<string, unknown>;  // type-specific extras, e.g. assignee_name, comment_body
}
\`\`\`

The normalizer (\`normalizeNotificationPayloadV2\`) in \`notificationTypes.ts\` handles
legacy payload shapes transparently so older rows still render correctly.

### Type-specific \`meta\` fields

| Type | Extra meta fields |
|------|-------------------|
| \`task.assignee_added\` / \`task.assignee_removed\` | \`assignee_name\` |
| \`comment.created\` | \`comment_body\`, \`commentPreview\` |
| \`attachment.added\` / \`attachment.removed\` | \`file_name\` |
| \`content.embedded\` | \`content_name\` |
| \`integration.email_sent\` | \`subject\` |
| \`integration.github_activity\` / \`integration.hubspot_activity\` | \`event\` |
| \`workspace.invite_sent\` | \`invitee_name\`, \`invitee_email\`, \`workspace_name\` |
| \`workspace.member_joined\` / \`workspace.member_removed\` | \`member_name\` |
| \`asset.created\` | \`type_label\` |
| \`task.added_to_list\` / \`task.removed_from_list\` | \`list_name\` |

---

## 4. Formatting Rules

**File:** \`src/lib/notifications/formatNotificationMessage.ts\`

**Returns:** \`FormattedNotification\`
\`\`\`ts
interface FormattedNotification {
  title: string;
  description?: string;   // change arrow "From → To" or comment preview
  actor: string;
  actorAvatarUrl: string | null;
  route: string | null;   // from payload.target.route
  entity: string;
}
\`\`\`

**Pattern:** Actor-first language — _Actor → Action → Object → Change detail_

### Per-type title templates (extracted from formatter)

| Type | Title template |
|------|----------------|
${entries
  .map((e) => `| \`${e.type}\` | ${e.titleTemplate.replace(/\|/g, "\\|")} |`)
  .join("\n")}

**Description field** (when present):
- Change types use an arrow: _Status → In Progress_ 
- \`comment.created\` uses \`meta.comment_body\` or \`meta.commentPreview\`
- Attachment/file types use \`meta.file_name\`
- Integration types use \`meta.event\` or \`meta.subject\`

---

## 5. Source Code Map

| Component | File | What it does |
|-----------|------|--------------|
| **Type definitions** | \`src/lib/notifications/notificationTypes.ts\` | Master list of all 43 notification types + \`NotificationPayloadV2\` interface |
| **Catalog metadata** | \`src/lib/notifications/notificationCatalog.ts\` | Per-type label, icon, entity classification |
| **Message formatter** | \`src/lib/notifications/formatNotificationMessage.ts\` | Converts payload → human-readable title + description |
| **Sonner allow-list** | \`src/lib/notifications/mapNotificationToToast.ts\` | \`REALTIME_TOAST_TYPES\` Set — which types trigger in-app toasts |
| **Realtime subscription** | \`src/hooks/useRealtimeNotifications.ts\` | Subscribes to Supabase postgres_changes, invalidates caches, shows toasts + desktop notifications |
| **Browser notifications** | \`src/lib/browserNotifications.ts\` | Native \`Notification\` API helpers, permission management, localStorage flags |
| **Inbox queries** | \`src/api/notifications.ts\` | \`listNotifications()\`, \`getUnreadNotificationCount()\`, \`markAsRead()\` |
| **Database schema** | \`supabase/migrations/*.sql\` | \`public.notifications\` table, RLS policies, indexes |

---

## 6. Delivery Layers

| Layer | File | How it works |
|-------|------|--------------|
| **Backend creation** | Edge functions, backend mutations | Inserts row into \`public.notifications\` with \`user_id\`, \`type\`, \`payload\` |
| **Inbox persistence** | \`src/api/notifications.ts\` | Fetched by \`listNotifications()\`, displayed in Inbox panel |
| **Unread badge** | \`src/api/notifications.ts\` → \`getUnreadNotificationCount()\` | React Query cache invalidated on each realtime INSERT |
| **Sonner in-app toast** | \`src/hooks/useRealtimeNotifications.ts\` + \`mapNotificationToToast.ts\` | Allow-list check (\`REALTIME_TOAST_TYPES\`), self-action dedup, then \`toast()\` from Sonner |
| **Browser desktop notification** | \`src/lib/browserNotifications.ts\` | \`showBrowserNotification()\` — requires \`Notification.permission === "granted"\`, not paused, and \`document.visibilityState !== "visible"\` |
| **Push notifications** | Not implemented | Planned — no OneSignal or service-worker push currently |

---

## 7. Realtime Flow

**Hook:** \`src/hooks/useRealtimeNotifications.ts\`

\`\`\`
supabase.channel(\`notifications:\${workspaceId}:\${userId}\`)
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications",
       filter: \`user_id=eq.\${userId}\` }, handler)
  .subscribe()
\`\`\`

**Handler logic (in order):**

1. **Query invalidation** — always invalidates \`notifications\` and \`unreadNotifications\`
   React Query caches so the inbox and badge stay current.

2. **Self-action dedup** — extracts \`payload.actor.id\`; if it matches the current
   authenticated user ID the handler returns early (user already got Sonner feedback
   from their own mutation).

3. **Allow-list check** — calls \`mapNotificationToToast(notification)\`; returns \`null\`
   for types not in \`REALTIME_TOAST_TYPES\` (see Section 1).

4. **Sonner toast** — shown for all non-self, allow-listed types.  Includes an "Open"
   action button if \`mapped.route\` is set.

5. **Visibility check** — if \`document.visibilityState !== "visible"\`, calls
   \`showBrowserNotification()\` with the same title/description/route.

6. **Browser notification guard** — inside \`showBrowserNotification()\`:
   - checks \`isBrowserNotificationSupported()\`
   - checks \`Notification.permission === "granted"\`
   - checks \`!isDesktopNotificationPaused()\` (localStorage flag)

---

## 8. Admin / Test Utilities

| Utility | Location | Description |
|---------|----------|-------------|
| **Test Inbox Refresh** | \`src/pages/workspace/SettingsPage.tsx\` | Inserts a notification row using the current user as actor; tests inbox refresh + unread badge. Self-action dedup means Sonner is suppressed. |
| **Test Realtime Toast** | \`src/pages/workspace/SettingsPage.tsx\` | Inserts a notification with a different actor ID; Sonner toast should appear immediately. |
| **Send Test Desktop Notification** | \`src/components/profile/ProfileEditModal.tsx\` (admin only) | Calls \`showBrowserNotification()\` directly — no DB row created. Requests permission first if still \`"default"\`. |

---

## 9. Debugging

### Console logs (current build)

The following \`console.log\` statements are active in the current build:

| Log prefix | Source | What it reports |
|------------|--------|-----------------|
| \`[RealtimeNotif] received\` | \`useRealtimeNotifications.ts\` | Every realtime INSERT with type, isSelfAction, actorId |
| \`[RealtimeNotif] skipped — self-action\` | \`useRealtimeNotifications.ts\` | Insert was the current user's own action |
| \`[RealtimeNotif] skipped — not on toast allow-list\` | \`useRealtimeNotifications.ts\` | Type is not in \`REALTIME_TOAST_TYPES\` |
| \`[RealtimeNotif] visibilityState: ...\` | \`useRealtimeNotifications.ts\` | Current tab visibility before deciding on desktop notification |
| \`[RealtimeNotif] browser notification skipped — tab is visible\` | \`useRealtimeNotifications.ts\` | Tab was focused; Sonner only |
| \`[BrowserNotification] skipped — Notifications API not supported\` | \`browserNotifications.ts\` | Browser doesn't support the API |
| \`[BrowserNotification] skipped — permission: ...\` | \`browserNotifications.ts\` | OS permission is \`default\` or \`denied\` |
| \`[BrowserNotification] skipped — paused by user\` | \`browserNotifications.ts\` | In-app pause flag is set |
| \`[BrowserNotification] shown\` | \`browserNotifications.ts\` | Desktop notification was created successfully |

### localStorage flags

${LS_KEYS.map((k) => `- \`${k}\``).join("\n")}

| Key | Purpose |
|-----|---------|
| \`bpc_desktop_notifications_paused\` | In-app pause toggle (does not revoke OS permission). Set via Pause button in Preferences. |
| \`bpc_desktop_notifications_prompt_dismissed\` | Tracks whether the user dismissed the app-load enable prompt. Persists across page reloads until manually cleared from localStorage. |

---

## 10. Orphaned / Inconsistent Types

Types that appear in one source but not another — useful for spotting gaps.

### Defined in \`notificationTypes.ts\` but missing from formatter switch-cases

${
  definedNotFormatted.length
    ? definedNotFormatted.map((t) => `- \`${t}\``).join("\n")
    : "_None — all types have formatter coverage._"
}

### In Sonner allow-list (\`REALTIME_TOAST_TYPES\`) but not in master type list

${
  sonnerNotInMasterList.length
    ? sonnerNotInMasterList.map((t) => `- \`${t}\``).join("\n")
    : "_None — allow-list is a strict subset of the master type list._"
}

### In formatter but not in catalog (no icon/label defined)

${
  formattedNotInCatalog.length
    ? formattedNotInCatalog.map((t) => `- \`${t}\``).join("\n")
    : "_None — all formatted types have a catalog entry._"
}

---

## 11. Example Rendered Messages

Below are example notifications showing how different types render in the UI.

${generateExamples()}

---

_Generated by \`scripts/generate-notifications-docs.mjs\` · ${now}_
`;

// ---------------------------------------------------------------------------
// 12.  Write output
// ---------------------------------------------------------------------------
const outPath = path.join(ROOT, "docs", "notifications.md");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, md, "utf8");

console.log(
  `✅  docs/notifications.md written (${ALL_TYPES.length} types documented)`,
);
