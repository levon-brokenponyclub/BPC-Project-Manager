import * as React from "react"
import {
  redirect,
  useLoaderData,
  useSearchParams,
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
} from "~/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import { Label } from "~/components/ui/label"
import { ScrollArea } from "~/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { SidebarInput } from "~/components/ui/sidebar"
import { Switch } from "~/components/ui/switch"
import { Textarea } from "~/components/ui/textarea"
import { AppSidebar } from "~/components/app-sidebar"
import { ModeToggle } from "~/components/mode-toggle"
import {
  Archive,
  ArchiveRestore,
  MoreHorizontal,
  Pin,
  PinOff,
  Trash2,
} from "lucide-react"
import { supabase } from "~/lib/supabase"
import { cn } from "~/lib/utils"
import { toast } from "sonner"

// ─── Types ────────────────────────────────────────────────────────────────────

type InboxView = "inbox" | "sent" | "pinned" | "archived"

interface WorkspaceMemberRow {
  user_id: string
  email: string
  full_name?: string | null
  role?: string | null
}

interface NotificationPayload {
  actor?: {
    id?: string | null
    name?: string | null
    email?: string | null
    avatar_url?: string | null
  }
  entity?: { type?: string | null; id?: string | null; name?: string | null }
  change?: { field?: string | null; from?: string | null; to?: string | null }
  inbox_meta?: {
    pinned_by?: string[]
    archived_by?: string[]
  }
}

interface NotificationRow {
  id: string
  workspace_id: string
  user_id: string
  type: string
  payload: NotificationPayload
  read_at: string | null
  created_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatType(type: string): string {
  const map: Record<string, string> = {
    "message.direct": "Direct message",
    "message.reply": "Reply",
    "message.mention": "Mention",
  }
  return map[type] ?? type.replace(/[._]/g, " ")
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

function previewTitle(n: NotificationRow): string {
  const map: Record<string, string> = {
    "message.direct": "Direct Message",
    "message.reply": "Reply",
    "message.mention": "Mention",
  }
  return map[n.type] ?? formatType(n.type)
}

function getMessageText(n: NotificationRow): string {
  return n.payload?.entity?.name ?? formatBody(n)
}

function isSentByUser(n: NotificationRow, userId: string): boolean {
  return (n.payload?.actor?.id ?? null) === userId
}

function hasInboxFlag(
  n: NotificationRow,
  userId: string,
  key: "pinned_by" | "archived_by"
): boolean {
  return n.payload?.inbox_meta?.[key]?.includes(userId) ?? false
}

function withInboxFlag(
  n: NotificationRow,
  userId: string,
  key: "pinned_by" | "archived_by",
  enabled: boolean
): NotificationPayload {
  const pinnedBy = [...(n.payload?.inbox_meta?.pinned_by ?? [])]
  const archivedBy = [...(n.payload?.inbox_meta?.archived_by ?? [])]
  const current = key === "pinned_by" ? pinnedBy : archivedBy

  if (enabled) {
    if (!current.includes(userId)) current.push(userId)
  } else {
    const idx = current.indexOf(userId)
    if (idx >= 0) current.splice(idx, 1)
  }

  return {
    ...n.payload,
    inbox_meta: {
      pinned_by: pinnedBy,
      archived_by: archivedBy,
    },
  }
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

// ─── MessageBubble ────────────────────────────────────────────────────────────

function MessageBubble({
  n,
  isSelf,
  isReply = false,
}: {
  n: NotificationRow
  isSelf: boolean
  isReply?: boolean
}) {
  const actor = n.payload?.actor
  const body = n.payload?.entity?.name ?? formatBody(n)
  const name = actor?.name ?? actor?.email ?? "System"

  return (
    <div
      className={cn(
        "flex items-start gap-3 py-2",
        isSelf && "flex-row-reverse"
      )}
    >
      <Avatar className="mt-0.5 h-8 w-8 shrink-0">
        <AvatarImage src={actor?.avatar_url ?? ""} />
        <AvatarFallback className="text-xs">
          {initials(actor?.name ?? actor?.email)}
        </AvatarFallback>
      </Avatar>
      <div
        className={cn("flex max-w-[75%] flex-col gap-1", isSelf && "items-end")}
      >
        <div
          className={cn(
            "flex items-baseline gap-2",
            isSelf && "flex-row-reverse"
          )}
        >
          <span className="text-sm font-semibold">{name}</span>
          {isReply && (
            <Badge variant="outline" className="text-[10px]">
              Reply
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {relativeTime(n.created_at)}
          </span>
        </div>
        <div
          className={cn(
            "rounded-lg px-3 py-2 text-sm leading-relaxed",
            isSelf ? "bg-primary text-primary-foreground" : "border bg-muted/40"
          )}
        >
          {body}
        </div>
      </div>
    </div>
  )
}

// ─── Loader ───────────────────────────────────────────────────────────────────

export async function clientLoader({ request }: ClientLoaderFunctionArgs) {
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

  if (!activeWorkspaceId)
    return {
      notifications: [] as NotificationRow[],
      workspaceMembers: [] as WorkspaceMemberRow[],
      workspaces,
      user,
      currentUserId: session.user.id,
      activeWorkspaceId,
      currentUserRole: null as string | null,
    }

  const { data: membersData } = await supabase.rpc(
    "get_workspace_users_with_emails",
    { workspace_id_param: activeWorkspaceId }
  )
  const workspaceMembers = (membersData ?? []) as WorkspaceMemberRow[]
  const currentUserRole =
    workspaceMembers.find((m) => m.user_id === session.user.id)?.role ?? null

  if (currentUserRole === "viewer") {
    return redirect(`/sprint-dashboard?ws=${activeWorkspaceId}`)
  }

  const MESSAGE_TYPES = ["message.direct", "message.reply", "message.mention"]

  const [receivedResult, sentResult] = await Promise.all([
    supabase
      .from("notifications")
      .select("*")
      .eq("workspace_id", activeWorkspaceId)
      .eq("user_id", session.user.id)
      .in("type", MESSAGE_TYPES)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("notifications")
      .select("*")
      .eq("workspace_id", activeWorkspaceId)
      .in("type", MESSAGE_TYPES)
      .filter("payload->actor->>id", "eq", session.user.id)
      .order("created_at", { ascending: false })
      .limit(200),
  ])

  const merged = new Map<string, NotificationRow>()
  for (const n of (receivedResult.data ?? []) as NotificationRow[]) {
    merged.set(n.id, n)
  }
  for (const n of (sentResult.data ?? []) as NotificationRow[]) {
    merged.set(n.id, n)
  }

  const notifications = Array.from(merged.values()).sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return {
    notifications,
    workspaceMembers,
    workspaces,
    user,
    currentUserId: session.user.id,
    activeWorkspaceId,
    currentUserRole,
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InboxPage() {
  const {
    notifications: initial,
    workspaceMembers,
    workspaces,
    user,
    currentUserId,
    activeWorkspaceId,
    currentUserRole,
  } = useLoaderData<typeof clientLoader>()
  const [searchParams] = useSearchParams()

  const boxParam = searchParams.get("box")
  const inboxView: InboxView =
    boxParam === "sent" || boxParam === "pinned" || boxParam === "archived"
      ? boxParam
      : "inbox"

  const memberMap = React.useMemo(() => {
    return new Map(
      (workspaceMembers as WorkspaceMemberRow[]).map((m) => [m.user_id, m])
    )
  }, [workspaceMembers])

  const [items, setItems] = React.useState<NotificationRow[]>(initial)
  const [selected, setSelected] = React.useState<NotificationRow | null>(
    initial[0] ?? null
  )
  const [thread, setThread] = React.useState<NotificationRow[]>([])
  const [search, setSearch] = React.useState("")
  const [unreadOnly, setUnreadOnly] = React.useState(false)
  const [readIds, setReadIds] = React.useState<Set<string>>(
    () => new Set(initial.filter((n) => n.read_at).map((n) => n.id))
  )
  const [replyBody, setReplyBody] = React.useState("")
  const [sendingReply, setSendingReply] = React.useState(false)
  const [composeOpen, setComposeOpen] = React.useState(false)
  const [composeRecipientId, setComposeRecipientId] = React.useState("")
  const [composeBody, setComposeBody] = React.useState("")
  const [sendingCompose, setSendingCompose] = React.useState(false)
  const threadEndRef = React.useRef<HTMLDivElement>(null)

  const isSentView = inboxView === "sent"
  const isPinnedView = inboxView === "pinned"
  const isArchivedView = inboxView === "archived"

  // ── Load thread when selection changes ───────────────────────────────────
  React.useEffect(() => {
    if (!selected) {
      setThread([])
      return
    }
    supabase
      .from("notifications")
      .select("*")
      .eq("workspace_id", selected.workspace_id)
      .in("type", ["message.reply"])
      .filter("payload->entity->>id", "eq", selected.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => setThread((data ?? []) as NotificationRow[]))
  }, [selected?.id])

  // Scroll to bottom when thread updates
  React.useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [thread])

  // ── Realtime subscription ─────────────────────────────────────────────────
  React.useEffect(() => {
    if (!activeWorkspaceId) return

    const channel = supabase
      .channel(`inbox:${activeWorkspaceId}`)
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
          // Only surface inbox-type messages in the list
          if (
            ["message.direct", "message.reply", "message.mention"].includes(
              incoming.type
            )
          ) {
            // Append to thread if it's a reply to the selected message
            if (
              incoming.type === "message.reply" &&
              incoming.payload?.entity?.id === selected?.id
            ) {
              setThread((prev) => [...prev, incoming])
            } else {
              if (
                incoming.user_id === currentUserId ||
                incoming.payload?.actor?.id === currentUserId
              ) {
                setItems((prev) => [incoming, ...prev])
              }
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeWorkspaceId, currentUserId, selected?.id])

  const filtered = items.filter((n) => {
    const isSent = isSentByUser(n, currentUserId)
    const isArchived = hasInboxFlag(n, currentUserId, "archived_by")
    const isPinned = hasInboxFlag(n, currentUserId, "pinned_by")

    if (isSentView && !isSent) return false
    if (!isSentView && n.user_id !== currentUserId) return false

    if (inboxView === "inbox" && isArchived) return false
    if (isPinnedView && (!isPinned || isArchived)) return false
    if (isArchivedView && !isArchived) return false

    if (!isSentView && unreadOnly && readIds.has(n.id)) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        previewTitle(n).toLowerCase().includes(q) ||
        (n.payload?.actor?.name ?? "").toLowerCase().includes(q) ||
        (n.payload?.entity?.name ?? "").toLowerCase().includes(q) ||
        getMessageText(n).toLowerCase().includes(q)
      )
    }
    return true
  })

  const unreadCount = items.filter(
    (n) => n.user_id === currentUserId && !readIds.has(n.id)
  ).length

  React.useEffect(() => {
    if (!selected) {
      setSelected(filtered[0] ?? null)
      return
    }
    if (!filtered.some((n) => n.id === selected.id)) {
      setSelected(filtered[0] ?? null)
      setReplyBody("")
    }
  }, [filtered, selected])

  async function handleSelect(n: NotificationRow) {
    setSelected(n)
    setReplyBody("")
    if (n.user_id === currentUserId && !readIds.has(n.id)) {
      setReadIds((prev) => new Set([...prev, n.id]))
      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", n.id)
    }
  }

  async function handleTogglePinned(n: NotificationRow) {
    if (n.user_id !== currentUserId) return
    const nextPinned = !hasInboxFlag(n, currentUserId, "pinned_by")
    const payload = withInboxFlag(n, currentUserId, "pinned_by", nextPinned)
    const { error } = await supabase
      .from("notifications")
      .update({ payload })
      .eq("id", n.id)

    if (error) {
      toast.error("Failed to update pinned state", {
        description: error.message,
      })
      return
    }

    setItems((prev) =>
      prev.map((it) => (it.id === n.id ? { ...it, payload } : it))
    )
    if (selected?.id === n.id)
      setSelected((prev) => (prev ? { ...prev, payload } : prev))
    toast.success(nextPinned ? "Pinned" : "Unpinned")
  }

  async function handleToggleArchived(n: NotificationRow) {
    if (n.user_id !== currentUserId) return
    const nextArchived = !hasInboxFlag(n, currentUserId, "archived_by")
    const payload = withInboxFlag(n, currentUserId, "archived_by", nextArchived)
    const { error } = await supabase
      .from("notifications")
      .update({ payload })
      .eq("id", n.id)

    if (error) {
      toast.error("Failed to update archived state", {
        description: error.message,
      })
      return
    }

    setItems((prev) =>
      prev.map((it) => (it.id === n.id ? { ...it, payload } : it))
    )
    if (selected?.id === n.id)
      setSelected((prev) => (prev ? { ...prev, payload } : prev))
    toast.success(nextArchived ? "Archived" : "Moved to inbox")
  }

  async function handleDelete(n: NotificationRow) {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", n.id)
    if (error) {
      toast.error("Failed to delete message", { description: error.message })
      return
    }
    setItems((prev) => prev.filter((it) => it.id !== n.id))
    if (selected?.id === n.id) {
      setSelected(null)
      setReplyBody("")
      setThread([])
    }
    toast.success("Message deleted")
  }

  async function handleReply() {
    if (!replyBody.trim() || !selected || !activeWorkspaceId) return
    setSendingReply(true)

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      setSendingReply(false)
      return
    }

    const actorEmail = selected.payload?.actor?.email ?? null
    const recipientId = isSentByUser(selected, currentUserId)
      ? selected.user_id
      : (selected.payload?.actor?.id ??
        (actorEmail
          ? workspaceMembers.find((m) => m.email === actorEmail)?.user_id
          : null))
    if (!recipientId) {
      setSendingReply(false)
      toast.error("Could not determine recipient for this message")
      return
    }

    const actor = {
      id: session.user.id,
      name: user.name || null,
      email: user.email || null,
      avatar_url: user.avatar || null,
    }

    const { error } = await supabase.from("notifications").insert({
      workspace_id: activeWorkspaceId,
      user_id: recipientId,
      type: "message.reply",
      payload: {
        actor,
        entity: { type: "message", id: selected.id, name: replyBody.trim() },
      },
    })

    setSendingReply(false)
    if (error) {
      toast.error("Failed to send reply", { description: error.message })
    } else {
      // Optimistically append to local thread
      const optimistic: NotificationRow = {
        id: crypto.randomUUID(),
        workspace_id: activeWorkspaceId,
        user_id: recipientId,
        type: "message.reply",
        payload: {
          actor,
          entity: { type: "message", id: selected.id, name: replyBody.trim() },
        },
        read_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }
      setThread((prev) => [...prev, optimistic])
      setReplyBody("")
    }
  }

  async function handleComposeSend() {
    if (!composeRecipientId || !composeBody.trim() || !activeWorkspaceId) return

    setSendingCompose(true)
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      setSendingCompose(false)
      toast.error("You must be signed in to send a message")
      return
    }

    const actor = {
      id: session.user.id,
      name: user.name || null,
      email: user.email || null,
      avatar_url: user.avatar || null,
    }

    const message = composeBody.trim()
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        workspace_id: activeWorkspaceId,
        user_id: composeRecipientId,
        type: "message.direct",
        payload: {
          actor,
          entity: { type: "message", name: message },
        },
      })
      .select("*")
      .single()

    setSendingCompose(false)

    if (error) {
      toast.error("Failed to send message", { description: error.message })
      return
    }

    if (data) {
      const newItem = data as NotificationRow
      setItems((prev) => [newItem, ...prev])
      setSelected(newItem)
      setThread([])
    }

    setComposeBody("")
    setComposeRecipientId("")
    setComposeOpen(false)
    toast.success("Message sent")
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
          {/* ── Left panel — inbox list ── */}
          <div className="flex w-[320px] shrink-0 flex-col border-r">
            {/* Panel header */}
            <div className="flex flex-col gap-3.5 border-b p-4">
              <div className="flex w-full items-center justify-between">
                <span className="text-base font-medium text-foreground">
                  {isSentView
                    ? "Sent"
                    : isPinnedView
                      ? "Pinned"
                      : isArchivedView
                        ? "Archived"
                        : "Inbox"}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setComposeOpen(true)}
                  >
                    New Message
                  </Button>
                  <Label className="flex items-center gap-2 text-sm">
                    <span>Unreads</span>
                    <Switch
                      className="shadow-none"
                      checked={unreadOnly}
                      disabled={isSentView}
                      onCheckedChange={setUnreadOnly}
                    />
                  </Label>
                </div>
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
                  No notifications
                </p>
              ) : (
                filtered.map((n) => {
                  const isUnread = !readIds.has(n.id)
                  const isActive = selected?.id === n.id
                  const isPinned = hasInboxFlag(n, currentUserId, "pinned_by")
                  const isArchived = hasInboxFlag(
                    n,
                    currentUserId,
                    "archived_by"
                  )
                  const canManageInboxState = n.user_id === currentUserId
                  const senderLabel = isSentView
                    ? `To: ${
                        memberMap.get(n.user_id)?.full_name?.trim() ||
                        memberMap.get(n.user_id)?.email ||
                        n.user_id
                      }`
                    : (n.payload?.actor?.name ??
                      n.payload?.actor?.email ??
                      "System")
                  return (
                    <div
                      key={n.id}
                      className={cn(
                        "flex flex-col items-start gap-2 border-b p-4 text-sm leading-tight whitespace-nowrap last:border-b-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        isActive &&
                          "bg-sidebar-accent text-sidebar-accent-foreground",
                        isUnread && !isActive && "bg-muted/20"
                      )}
                    >
                      <button
                        onClick={() => handleSelect(n)}
                        className="w-full text-left"
                      >
                        <div className="flex w-full items-center gap-2">
                          <span
                            className={cn(
                              "truncate",
                              isUnread && "font-semibold"
                            )}
                          >
                            {senderLabel}
                          </span>
                          {isPinned && (
                            <Pin className="size-3.5 shrink-0 text-muted-foreground" />
                          )}
                          {isArchived && (
                            <Archive className="size-3.5 shrink-0 text-muted-foreground" />
                          )}
                          <span className="ml-auto shrink-0 text-xs">
                            {relativeTime(n.created_at)}
                          </span>
                        </div>
                        <span
                          className={cn(
                            "font-medium",
                            isUnread && "font-semibold"
                          )}
                        >
                          {previewTitle(n)}
                        </span>
                        <span className="line-clamp-2 w-65 text-xs whitespace-break-spaces">
                          {getMessageText(n)}
                        </span>
                      </button>

                      {canManageInboxState && (
                        <div className="flex w-full justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                              >
                                <MoreHorizontal className="size-4" />
                                <span className="sr-only">Message actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleTogglePinned(n)}
                              >
                                {isPinned ? (
                                  <>
                                    <PinOff className="mr-2 size-4" />
                                    Unpin
                                  </>
                                ) : (
                                  <>
                                    <Pin className="mr-2 size-4" />
                                    Pin
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleToggleArchived(n)}
                              >
                                {isArchived ? (
                                  <>
                                    <ArchiveRestore className="mr-2 size-4" />
                                    Move to Inbox
                                  </>
                                ) : (
                                  <>
                                    <Archive className="mr-2 size-4" />
                                    Archive
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(n)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 size-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>
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
                    <BreadcrumbLink href="#">Messages</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>
                      {isSentView
                        ? "Sent"
                        : isPinnedView
                          ? "Pinned"
                          : isArchivedView
                            ? "Archived"
                            : "Inbox"}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
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
              <>
                {/* ── Thread ── */}
                <ScrollArea className="flex-1">
                  <div className="flex flex-col gap-1 p-6">
                    {/* Original message */}
                    <MessageBubble
                      n={selected}
                      isSelf={
                        user.email === (selected.payload?.actor?.email ?? "")
                      }
                    />

                    {/* Replies */}
                    {thread.map((r) => (
                      <MessageBubble
                        key={r.id}
                        n={r}
                        isSelf={user.email === (r.payload?.actor?.email ?? "")}
                        isReply
                      />
                    ))}
                    <div ref={threadEndRef} />
                  </div>
                </ScrollArea>

                {/* ── Reply input ── */}
                <div className="border-t p-4">
                  <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
                    <Avatar className="mt-0.5 h-8 w-8 shrink-0">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="text-xs">
                        {initials(user.name || user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <textarea
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                          handleReply()
                      }}
                      placeholder="Reply to message…"
                      rows={3}
                      className="flex-1 resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
                    />
                  </div>
                  <div className="mt-2 flex justify-end">
                    <Button
                      size="sm"
                      onClick={handleReply}
                      disabled={!replyBody.trim() || sendingReply}
                    >
                      {sendingReply ? "Sending…" : "Reply"}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                Select a notification
              </div>
            )}
          </div>
        </div>
      </SidebarInset>

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Recipient</Label>
              <Select
                value={composeRecipientId}
                onValueChange={setComposeRecipientId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select recipient" />
                </SelectTrigger>
                <SelectContent>
                  {workspaceMembers
                    .filter((m) => m.user_id !== currentUserId)
                    .map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        {m.full_name ? `${m.full_name} (${m.email})` : m.email}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Message</Label>
              <Textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                placeholder="Write your message..."
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleComposeSend}
              disabled={
                !composeRecipientId || !composeBody.trim() || sendingCompose
              }
            >
              {sendingCompose ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
