import * as React from "react"
import {
  redirect,
  useLoaderData,
  useParams,
  type ClientLoaderFunctionArgs,
} from "react-router"
import { resolveWorkspaceId } from "~/lib/activeWorkspace"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb"
import { Separator } from "~/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  SidebarInput,
} from "~/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { Badge } from "~/components/ui/badge"
import { Label } from "~/components/ui/label"
import { ScrollArea } from "~/components/ui/scroll-area"
import { Switch } from "~/components/ui/switch"
import { AppSidebar } from "~/components/app-sidebar"
import { ModeToggle } from "~/components/mode-toggle"
import { supabase } from "~/lib/supabase"
import { cn } from "~/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface NotificationRow {
  id: string
  workspace_id: string
  user_id: string
  type: string
  payload: {
    actor?: {
      id?: string | null
      name?: string | null
      email?: string | null
      avatar_url?: string | null
    }
    entity?: { type?: string | null; id?: string | null; name?: string | null }
    change?: { field?: string | null; from?: string | null; to?: string | null }
  }
  read_at: string | null
  created_at: string
}

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORIES = {
  tasks: {
    label: "Tasks",
    types: [
      "task.created",
      "task.deleted",
      "task.status_changed",
      "task.priority_changed",
      "task.due_date_changed",
      "task.assignee_added",
      "task.assignee_removed",
      "task.name_changed",
      "task.description_changed",
    ],
  },
  comments: {
    label: "Comments",
    types: ["comment.created", "comment.assigned"],
  },
  attachments: {
    label: "Attachments",
    types: ["attachment.added", "attachment.removed"],
  },
  assets: {
    label: "Assets",
    types: [
      "asset.created",
      "asset.updated",
      "asset.deleted",
      "asset.file_uploaded",
    ],
  },
  members: {
    label: "Members",
    types: [
      "workspace.invite_sent",
      "workspace.member_joined",
      "workspace.member_removed",
    ],
  },
} as const

type CategoryKey = keyof typeof CATEGORIES

// All non-message types
const ALL_ACTIVITY_TYPES = Object.values(CATEGORIES).flatMap((c) => c.types)

const TYPE_LABEL: Record<string, string> = {
  "task.created": "Task created",
  "task.deleted": "Task deleted",
  "task.status_changed": "Status changed",
  "task.priority_changed": "Priority changed",
  "task.due_date_changed": "Due date changed",
  "task.assignee_added": "Assignee added",
  "task.assignee_removed": "Assignee removed",
  "task.name_changed": "Task renamed",
  "task.description_changed": "Description updated",
  "comment.created": "New comment",
  "comment.assigned": "Comment assigned",
  "attachment.added": "File attached",
  "attachment.removed": "Attachment removed",
  "asset.created": "Asset added",
  "asset.updated": "Asset updated",
  "asset.deleted": "Asset deleted",
  "asset.file_uploaded": "File uploaded",
  "workspace.invite_sent": "Invite sent",
  "workspace.member_joined": "Member joined",
  "workspace.member_removed": "Member removed",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatType(type: string): string {
  return TYPE_LABEL[type] ?? type.replace(/[._]/g, " ")
}

function formatBody(n: NotificationRow): string {
  const actor = n.payload?.actor?.name ?? n.payload?.actor?.email ?? "Someone"
  const entity = n.payload?.entity?.name ?? "an item"
  const change = n.payload?.change

  if (change?.from && change?.to) {
    return `${actor} changed ${change.field ?? "a field"} from "${change.from}" to "${change.to}" on ${entity}`
  }
  return `${actor} — ${entity}`
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

function initials(name: string | null | undefined): string {
  if (!name) return "?"
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function isCategoryKey(s: string | undefined): s is CategoryKey {
  return !!s && s in CATEGORIES
}

// ─── Loader ───────────────────────────────────────────────────────────────────

export async function clientLoader({
  request,
  params,
}: ClientLoaderFunctionArgs) {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return redirect("/login")

  const { data: wsRows } = await supabase
    .from("my_workspaces")
    .select("id,name")
    .order("name", { ascending: true })
  const workspaces = (wsRows ?? []) as { id: string; name: string }[]

  const url = new URL(request.url)
  const wsParam = url.searchParams.get("ws")
  const activeWorkspaceId = resolveWorkspaceId(wsParam, workspaces)

  const user = {
    name: session.user.user_metadata?.full_name ?? session.user.email ?? "",
    email: session.user.email ?? "",
    avatar: session.user.user_metadata?.avatar_url ?? "",
  }

  const category = isCategoryKey(params.category) ? params.category : null
  const types = category ? CATEGORIES[category].types : ALL_ACTIVITY_TYPES

  if (!activeWorkspaceId)
    return {
      notifications: [] as NotificationRow[],
      workspaces,
      user,
      activeWorkspaceId,
      category,
      currentUserRole: null as string | null,
    }

  const { data: membersData } = await supabase.rpc(
    "get_workspace_users_with_emails",
    { workspace_id_param: activeWorkspaceId }
  )
  const currentUserRole =
    ((membersData ?? []) as { user_id: string; role?: string | null }[]).find(
      (m) => m.user_id === session.user.id
    )?.role ?? null

  if (currentUserRole === "viewer") {
    return redirect(`/sprint-dashboard?ws=${activeWorkspaceId}`)
  }

  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("workspace_id", activeWorkspaceId)
    .eq("user_id", session.user.id)
    .in("type", [...types])
    .order("created_at", { ascending: false })
    .limit(100)

  const notifications = (data ?? []) as NotificationRow[]
  return {
    notifications,
    workspaces,
    user,
    activeWorkspaceId,
    category,
    currentUserRole,
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ActivityPage() {
  const {
    notifications: initial,
    workspaces,
    user,
    activeWorkspaceId,
    category: loaderCategory,
    currentUserRole,
  } = useLoaderData<typeof clientLoader>()

  // params.category may differ from loaderCategory on client nav — use params as truth
  const params = useParams()
  const category = isCategoryKey(params.category) ? params.category : null
  const categoryLabel = category ? CATEGORIES[category].label : "All Activity"
  const categoryTypes = category
    ? ([...CATEGORIES[category].types] as string[])
    : ALL_ACTIVITY_TYPES

  const [items, setItems] = React.useState<NotificationRow[]>(initial)
  const [selected, setSelected] = React.useState<NotificationRow | null>(
    initial[0] ?? null
  )
  const [search, setSearch] = React.useState("")
  const [unreadOnly, setUnreadOnly] = React.useState(false)
  const [readIds, setReadIds] = React.useState<Set<string>>(
    () => new Set(initial.filter((n) => n.read_at).map((n) => n.id))
  )

  // Reset list when category changes (client-side navigation)
  React.useEffect(() => {
    setItems(initial)
    setSelected(initial[0] ?? null)
    setReadIds(new Set(initial.filter((n) => n.read_at).map((n) => n.id)))
  }, [loaderCategory, initial])

  // ── Realtime subscription ─────────────────────────────────────────────────
  React.useEffect(() => {
    if (!activeWorkspaceId) return

    const channel = supabase
      .channel(`activity:${activeWorkspaceId}:${category ?? "all"}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `workspace_id=eq.${activeWorkspaceId}`,
        },
        (payload) => {
          const incoming = payload.new as NotificationRow
          // Only surface if it matches the current category filter
          if (categoryTypes.includes(incoming.type)) {
            setItems((prev) => [incoming, ...prev])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeWorkspaceId, category])

  const filtered = items.filter((n) => {
    if (unreadOnly && readIds.has(n.id)) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        formatType(n.type).toLowerCase().includes(q) ||
        (n.payload?.actor?.name ?? "").toLowerCase().includes(q) ||
        (n.payload?.entity?.name ?? "").toLowerCase().includes(q)
      )
    }
    return true
  })

  const unreadCount = items.filter((n) => !readIds.has(n.id)).length

  async function handleSelect(n: NotificationRow) {
    setSelected(n)
    if (!readIds.has(n.id)) {
      setReadIds((prev) => new Set([...prev, n.id]))
      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", n.id)
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        user={user}
        currentUserRole={currentUserRole}
      />
      <SidebarInset className="overflow-hidden">
        <div className="flex h-full overflow-hidden">
          {/* ── Left panel — activity list ── */}
          <div className="flex w-[320px] shrink-0 flex-col border-r">
            {/* Panel header */}
            <div className="flex flex-col gap-3.5 border-b p-4">
              <div className="flex w-full items-center justify-between">
                <span className="text-base font-medium text-foreground">
                  {categoryLabel}
                </span>
                <Label className="flex items-center gap-2 text-sm">
                  <span>Unreads</span>
                  <Switch
                    className="shadow-none"
                    checked={unreadOnly}
                    onCheckedChange={setUnreadOnly}
                  />
                </Label>
              </div>
              <SidebarInput
                placeholder="Type to search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* List */}
            <ScrollArea className="flex-1">
              {filtered.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  No activity
                </p>
              ) : (
                filtered.map((n) => {
                  const isUnread = !readIds.has(n.id)
                  const isActive = selected?.id === n.id
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleSelect(n)}
                      className={cn(
                        "flex w-full flex-col items-start gap-2 border-b p-4 text-left text-sm leading-tight last:border-b-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        isActive &&
                          "bg-sidebar-accent text-sidebar-accent-foreground",
                        isUnread && !isActive && "bg-muted/20"
                      )}
                    >
                      <div className="flex w-full items-center gap-2">
                        <span
                          className={cn(
                            "truncate",
                            isUnread && "font-semibold"
                          )}
                        >
                          {n.payload?.actor?.name ??
                            n.payload?.actor?.email ??
                            "System"}
                        </span>
                        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                          {relativeTime(n.created_at)}
                        </span>
                        {isUnread && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        )}
                      </div>
                      <span className="font-medium">{formatType(n.type)}</span>
                      <span className="line-clamp-2 w-[260px] text-xs whitespace-break-spaces text-muted-foreground">
                        {formatBody(n)}
                      </span>
                    </button>
                  )
                })
              )}
            </ScrollArea>
          </div>

          {/* ── Right panel — detail ── */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Header with trigger */}
            <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/activity">Activity</BreadcrumbLink>
                  </BreadcrumbItem>
                  {category && (
                    <>
                      <BreadcrumbSeparator className="hidden md:block" />
                      <BreadcrumbItem>
                        <BreadcrumbPage>{categoryLabel}</BreadcrumbPage>
                      </BreadcrumbItem>
                    </>
                  )}
                </BreadcrumbList>
              </Breadcrumb>
              <div className="ml-auto flex items-center gap-2">
                {unreadCount > 0 && (
                  <Badge variant="secondary">{unreadCount} unread</Badge>
                )}
                <ModeToggle />
              </div>
            </header>

            {/* Detail content */}
            {selected ? (
              <ScrollArea className="flex-1 p-6">
                {/* Actor header */}
                <div className="mb-6 flex items-start gap-4">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage
                      src={selected.payload?.actor?.avatar_url ?? ""}
                    />
                    <AvatarFallback>
                      {initials(
                        selected.payload?.actor?.name ??
                          selected.payload?.actor?.email
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {selected.payload?.actor?.name ??
                          selected.payload?.actor?.email ??
                          "System"}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {formatType(selected.type)}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(selected.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Body */}
                <div className="rounded-lg border bg-muted/40 p-4 text-sm leading-relaxed">
                  {formatBody(selected)}
                </div>

                {/* Metadata */}
                <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
                  {selected.payload?.entity?.type && (
                    <>
                      <dt className="text-muted-foreground">Type</dt>
                      <dd className="capitalize">
                        {selected.payload.entity.type}
                      </dd>
                    </>
                  )}
                  {selected.payload?.entity?.name && (
                    <>
                      <dt className="text-muted-foreground">Entity</dt>
                      <dd>{selected.payload.entity.name}</dd>
                    </>
                  )}
                  {selected.payload?.change?.field && (
                    <>
                      <dt className="text-muted-foreground">Field</dt>
                      <dd className="capitalize">
                        {selected.payload.change.field}
                      </dd>
                    </>
                  )}
                  {selected.payload?.change?.from && (
                    <>
                      <dt className="text-muted-foreground">From</dt>
                      <dd>{selected.payload.change.from}</dd>
                    </>
                  )}
                  {selected.payload?.change?.to && (
                    <>
                      <dt className="text-muted-foreground">To</dt>
                      <dd>{selected.payload.change.to}</dd>
                    </>
                  )}
                </dl>
              </ScrollArea>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                Select an activity item
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
