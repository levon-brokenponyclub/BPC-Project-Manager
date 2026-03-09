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
 * the switch-case block.  We do a simple regex per case block.
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
  // grab first title = `...` or title = actor + ...
  const titleMatch = body.match(/title\s*=\s*`([^`]+)`/);
  if (titleMatch) return titleMatch[1];
  // fallback: multi-line ternary — grab the first string fragment
  const ternaryMatch = body.match(/title\s*=\s*[^;]+?`([^`]+)`/);
  if (ternaryMatch) return ternaryMatch[1];
  return null;
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
// 5.  Infer route category from formatter source
// ---------------------------------------------------------------------------
function inferRoute(type) {
  const entity = (extractCatalogEntry(type) || {}).entity || "";
  if (
    type.startsWith("task.") ||
    type.startsWith("comment.") ||
    type.startsWith("attachment.")
  )
    return "/w/:id/tasks";
  if (type.startsWith("asset.")) return "/w/:id/assets";
  if (type.startsWith("workspace.")) return "/w/:id/settings or /w/:id/clients";
  if (type.startsWith("integration.")) return "n/a";
  if (type.startsWith("list.")) return "/w/:id/tasks";
  if (type.startsWith("content.")) return "/w/:id/tasks";
  return "—";
}

// ---------------------------------------------------------------------------
// 6.  Detect localStorage keys from browserNotifications.ts
// ---------------------------------------------------------------------------
const browserSource = read("src/lib/browserNotifications.ts");

const LS_KEYS = [];
for (const m of browserSource.matchAll(/["'](bpc_[^"']+)["']/g)) {
  if (!LS_KEYS.includes(m[1])) LS_KEYS.push(m[1]);
}

// ---------------------------------------------------------------------------
// 7.  Build per-type metadata model
// ---------------------------------------------------------------------------
const entries = ALL_TYPES.map((type) => {
  const catalog = extractCatalogEntry(type);
  const titleTemplate = extractTitleTemplate(type);
  return {
    type,
    label: catalog?.label ?? type,
    entity: catalog?.entity ?? "—",
    icon: catalog?.icon ?? "—",
    inbox: true, // all types persisted to public.notifications
    sonner: SONNER_SET.has(type),
    browser: BROWSER_SET.has(type),
    push: "planned",
    route: inferRoute(type),
    titleTemplate: titleTemplate ?? "—",
  };
});

// ---------------------------------------------------------------------------
// 8.  Orphan analysis
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
// 9.  Render Markdown
// ---------------------------------------------------------------------------
const now = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";

const yesNo = (v) =>
  v === true ? "✅" : v === "planned" ? "🔜 planned" : "❌";

function tableRow(e) {
  return `| \`${e.type}\` | ${e.label} | ${e.entity} | ${yesNo(e.inbox)} | ${yesNo(e.sonner)} | ${yesNo(e.browser)} | ${yesNo(e.push)} | \`${e.route}\` |`;
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
      ├── shows a Sonner in-app toast  [if type is on the allow-list]
      └── shows a browser desktop notification  [if tab hidden + permission granted]
\`\`\`

**Persistence:** All notification rows are stored in \`public.notifications\` and
displayed in the in-app Inbox panel.  The inbox is the durable notification history.

**Realtime toasts:** A subset of high-value types produce a Sonner toast via
\`mapNotificationToToast.ts\`.

**Browser desktop notifications:** Fired from \`showBrowserNotification()\` in
\`src/lib/browserNotifications.ts\`, only when \`document.visibilityState !== "visible"\`
and OS permission is granted.

**Push notifications:** Not yet implemented — marked as \`planned\` in the table below.

---

## 1. Notification Types

| Type | Label | Entity | Inbox | Sonner | Browser | Push | Route |
|------|-------|--------|-------|--------|---------|------|-------|
${entries.map(tableRow).join("\n")}

**Legend:** ✅ = active  🔜 planned = not yet implemented  ❌ = not applicable

---

## 2. Notification Payload Structure

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

## 3. Formatting Rules

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

## 4. Delivery Layers

| Layer | File | How it works |
|-------|------|--------------|
| **Inbox persistence** | \`supabase/migrations/\` + backend edge functions | Row inserted into \`public.notifications\`; fetched by \`listNotifications()\` in \`src/api/notifications.ts\` |
| **Unread badge** | \`src/api/notifications.ts\` → \`getUnreadNotificationCount()\` | React Query cache invalidated on each realtime INSERT |
| **Sonner in-app toast** | \`src/hooks/useRealtimeNotifications.ts\` + \`src/lib/notifications/mapNotificationToToast.ts\` | Allow-list check (\`REALTIME_TOAST_TYPES\`), self-action dedup, then \`toast()\` from Sonner |
| **Browser desktop notification** | \`src/lib/browserNotifications.ts\` | \`showBrowserNotification()\` — requires \`Notification.permission === "granted"\`, in-app not paused, and \`document.visibilityState !== "visible"\` |
| **Push notifications** | Not implemented | Planned — no OneSignal or service-worker push currently |

---

## 5. Realtime Flow

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

## 6. Admin / Test Utilities

| Utility | Location | Description |
|---------|----------|-------------|
| **Test Inbox Refresh** | \`src/pages/workspace/SettingsPage.tsx\` | Inserts a notification row using the current user as actor; tests inbox refresh + unread badge. Self-action dedup means Sonner is suppressed. |
| **Test Realtime Toast** | \`src/pages/workspace/SettingsPage.tsx\` | Inserts a notification with a different actor ID; Sonner toast should appear immediately. |
| **Send Test Desktop Notification** | \`src/components/profile/ProfileEditModal.tsx\` (admin only) | Calls \`showBrowserNotification()\` directly — no DB row created. Requests permission first if still \`"default"\`. |

---

## 7. Debugging

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
| \`bpc_desktop_notifications_prompt_dismissed\` | Tracks whether the user dismissed the app-load enable prompt. Cleared on page reload only if removed manually. |

---

## 8. Orphaned / Inconsistent Types

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

_Generated by \`scripts/generate-notifications-docs.mjs\` · ${now}_
`;

// ---------------------------------------------------------------------------
// 10.  Write output
// ---------------------------------------------------------------------------
const outPath = path.join(ROOT, "docs", "notifications.md");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, md, "utf8");

console.log(
  `✅  docs/notifications.md written (${ALL_TYPES.length} types documented)`,
);
