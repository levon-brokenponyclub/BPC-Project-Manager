import * as React from "react"
import {
  redirect,
  useLoaderData,
  useRevalidator,
  type ClientLoaderFunctionArgs,
} from "react-router"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { toast } from "sonner"
import { ModeToggle } from "~/components/mode-toggle"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { ScrollArea } from "~/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { Separator } from "~/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { Textarea } from "~/components/ui/textarea"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar"
import { ChevronDown } from "lucide-react"
import {
  IconCircleCheckFilled,
  IconCircleDashed,
  IconCircleX,
  IconClock,
  IconDownload,
  IconFile,
  IconLayoutSidebarRightCollapse,
  IconLayoutSidebarRightExpand,
  IconLoader,
  IconMessage,
  IconPaperclip,
  IconUpload,
  IconX,
} from "@tabler/icons-react"
import { AppSidebar } from "~/components/app-sidebar"
import { supabase } from "~/lib/supabase"
import { TasksDataTable } from "~/features/tasks/components/TasksDataTable"
import { resolveWorkspaceId } from "~/lib/activeWorkspace"
import type { TaskPriority, TaskRow, TaskStatus } from "~/features/tasks/types"

interface WorkspaceUser {
  user_id: string
  email: string
  role?: string | null
  first_name?: string | null
  surname?: string | null
  avatar_url?: string | null
}

function resolveUserDisplayName(wu: WorkspaceUser): string {
  const full = [wu.first_name, wu.surname].filter(Boolean).join(" ").trim()
  return full || wu.email
}

interface TaskActivityEntry {
  id: string
  task_id: string
  type: string
  created_at: string
  payload?: Record<string, unknown>
}

// ─── Activity helpers (ported from V1 TaskDrawer) ──────────────────────────

function readStr(
  record: Record<string, unknown>,
  keys: readonly string[]
): string | null {
  for (const key of keys) {
    const v = record[key]
    if (typeof v === "string" && v.trim().length > 0) return v.trim()
  }
  return null
}

function toRec(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {}
}

function formatEventAction(
  type: string,
  payload: Record<string, unknown>
): string {
  const field = readStr(payload, ["field", "changed_field"])
  const toValue = readStr(payload, ["to", "new", "next"])
  const fromValue = readStr(payload, ["from", "old", "previous"])
  const assigneeName = readStr(payload, ["assignee_name", "assigneeName"])

  if (type === "task_created") return "created the task."
  if (type === "task_deleted") return "deleted the task."

  if (type === "status_changed" || field === "status") {
    if (fromValue && toValue)
      return `changed the status from ${fromValue} to ${toValue}.`
    return toValue ? `changed the status to ${toValue}.` : "changed the status."
  }

  if (field === "assignee" || field === "assignee_user_id") {
    const next = assigneeName ?? toValue
    return next ? `changed the assignee to ${next}.` : "changed the assignee."
  }

  if (field === "due_date" || field === "dueDate") {
    return toValue
      ? `updated the due date to ${new Date(toValue).toLocaleDateString()}.`
      : "updated the due date."
  }

  if (field === "title") {
    return toValue ? `renamed the task to "${toValue}".` : "updated the title."
  }

  if (field === "priority") {
    return toValue
      ? `changed the priority to ${toValue}.`
      : "changed the priority."
  }

  if (type === "task_updated") {
    if (fromValue && toValue && fromValue !== toValue)
      return `updated the task from ${fromValue} to ${toValue}.`
    return "updated the task."
  }

  if (type === "comment_added" || type === "comment.created") {
    const body =
      readStr(toRec(payload.entity), ["name"]) ??
      readStr(payload, ["body", "comment"])
    return body ?? "posted a comment."
  }

  return type
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .concat(".")
}

function resolveActivityActor(
  payload: Record<string, unknown>,
  workspaceUsers: WorkspaceUser[]
): string {
  const actorRec = toRec(payload.actor)
  // Check embedded actor object first
  const fromActor =
    readStr(actorRec, ["name", "full_name"]) ?? readStr(actorRec, ["email"])
  if (fromActor) return fromActor
  // Check top-level payload keys
  const fromPayload =
    readStr(payload, ["actor_name", "user_name", "by", "name"]) ??
    readStr(payload, ["actor_email", "email"])
  if (fromPayload) return fromPayload
  // Resolve by user_id from workspace list
  const userId =
    readStr(actorRec, ["id"]) ??
    readStr(payload, ["actor_user_id", "user_id", "created_by", "changed_by"])
  if (userId) {
    const member = workspaceUsers.find((wu) => wu.user_id === userId)
    if (member) return resolveUserDisplayName(member)
  }
  return "System"
}

function relativeActivityTime(iso: string): string {
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
  const parentFilter = url.searchParams.get("parent")
  const activeWorkspaceId = resolveWorkspaceId(wsParam, workspaces)

  const user = {
    name: session.user.user_metadata?.full_name ?? session.user.email ?? "",
    email: session.user.email ?? "",
    avatar: session.user.user_metadata?.avatar_url ?? "",
  }

  const MESSAGE_TYPES = ["message.direct", "message.reply", "message.mention"]

  if (!activeWorkspaceId) {
    return {
      tasks: [] as TaskRow[],
      workspaceUsers: [] as WorkspaceUser[],
      inboxUnreadCount: 0,
      activityUnreadCount: 0,
      workspaces,
      user,
      activeWorkspaceId,
      currentUserRole: null as string | null,
      parentFilter: null as string | null,
      parentFilterTitle: null as string | null,
    }
  }

  const taskQuery = (() => {
    let q = supabase
      .from("tasks")
      .select("*")
      .eq("workspace_id", activeWorkspaceId)
    if (parentFilter) q = q.eq("parent_task_id", parentFilter)
    return q.order("due_date", { ascending: true })
  })()

  const [taskResult, inboxResult, activityResult] = await Promise.all([
    taskQuery,
    supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", activeWorkspaceId)
      .eq("user_id", session.user.id)
      .in("type", MESSAGE_TYPES)
      .is("read_at", null),
    supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", activeWorkspaceId)
      .eq("user_id", session.user.id)
      .not("type", "in", `(${MESSAGE_TYPES.join(",")})`)
      .is("read_at", null),
  ])

  const inboxUnreadCount = inboxResult.count ?? 0
  const activityUnreadCount = activityResult.count ?? 0
  const { data: taskRows, error } = taskResult

  const { data: workspaceUsersData } = await supabase.rpc(
    "get_workspace_users_with_emails",
    { workspace_id_param: activeWorkspaceId }
  )
  const workspaceUsersList = (workspaceUsersData ?? []) as WorkspaceUser[]
  const currentUserRole =
    workspaceUsersList.find((wu) => wu.user_id === session.user.id)?.role ??
    null

  if (currentUserRole === "viewer") {
    return redirect(`/sprint-dashboard?ws=${activeWorkspaceId}`)
  }

  let parentFilterTitle: string | null = null
  if (parentFilter) {
    const { data: parentTask } = await supabase
      .from("tasks")
      .select("title")
      .eq("workspace_id", activeWorkspaceId)
      .eq("id", parentFilter)
      .maybeSingle()
    parentFilterTitle = (parentTask?.title as string | undefined) ?? null
  }

  if (error || !taskRows?.length) {
    return {
      tasks: [] as TaskRow[],
      workspaceUsers: workspaceUsersList,
      inboxUnreadCount,
      activityUnreadCount,
      workspaces,
      user,
      activeWorkspaceId,
      currentUserRole,
      parentFilter,
      parentFilterTitle,
    }
  }

  const userMap = new Map<string, string>()
  workspaceUsersList.forEach((wu) => {
    if (wu.user_id && wu.email) userMap.set(wu.user_id, wu.email)
  })

  const allTasks: TaskRow[] = taskRows.map((t: Record<string, unknown>) => ({
    id: t.id as string,
    workspace_id: t.workspace_id as string,
    title: t.title as string,
    status: t.status as TaskRow["status"],
    priority: (t.priority ?? null) as TaskRow["priority"],
    due_date: (t.due_date ?? null) as string | null,
    assignee_user_id: (t.assignee_user_id ?? null) as string | null,
    created_by: t.created_by as string,
    created_at: t.created_at as string,
    updated_at: t.updated_at as string,
    parent_task_id: (t.parent_task_id ?? null) as string | null,
    description: (t.description ?? null) as string | null,
    estimated_hours: (t.estimated_hours ?? null) as number | null,
    billable: (t.billable ?? true) as boolean,
    client_visible: (t.client_visible ?? true) as boolean,
    blocked: (t.blocked ?? false) as boolean,
    blocked_reason: (t.blocked_reason ?? null) as string | null,
    assignee_email: t.assignee_user_id
      ? (userMap.get(t.assignee_user_id as string) ?? null)
      : null,
  }))

  // When filtering by parent, return the child tasks flat (no nesting needed)
  // Otherwise nest subtasks under their parents as usual
  let tasks: TaskRow[]
  if (parentFilter) {
    tasks = allTasks
  } else {
    const childMap = new Map<string, TaskRow[]>()
    for (const t of allTasks) {
      if (t.parent_task_id) {
        const arr = childMap.get(t.parent_task_id) ?? []
        arr.push(t)
        childMap.set(t.parent_task_id, arr)
      }
    }
    tasks = allTasks
      .filter((t) => !t.parent_task_id)
      .map((t) => ({ ...t, subRows: childMap.get(t.id) }))
  }

  return {
    tasks,
    workspaceUsers: workspaceUsersList,
    inboxUnreadCount,
    activityUnreadCount,
    workspaces,
    user,
    activeWorkspaceId,
    currentUserRole,
    parentFilter,
    parentFilterTitle,
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const statusIcon: Record<TaskStatus, React.ReactNode> = {
  Todo: <IconCircleDashed className="size-3.5 text-muted-foreground" />,
  Upcoming: <IconCircleDashed className="size-3.5 text-muted-foreground" />,
  "In Progress": <IconLoader className="size-3.5 text-blue-500" />,
  "In Review": <IconLoader className="size-3.5 text-yellow-500" />,
  "Awaiting Client": <IconClock className="size-3.5 text-orange-500" />,
  "On Hold": <IconClock className="size-3.5 text-muted-foreground" />,
  Complete: (
    <IconCircleCheckFilled className="size-3.5 fill-green-500 dark:fill-green-400" />
  ),
  Cancelled: <IconCircleX className="size-3.5 text-destructive" />,
}

const priorityVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  Normal: "outline",
  Medium: "secondary",
  High: "secondary",
  Urgent: "destructive",
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return ""
  return iso.split("T")[0]
}

// ─── Task detail panel (inline, stateful) ────────────────────────────────────

function TaskDetail({
  task,
  workspaceUsers,
  listVisible,
  onToggleList,
  onClose,
  onSaved,
}: {
  task: TaskRow
  workspaceUsers: WorkspaceUser[]
  listVisible: boolean
  onToggleList: () => void
  onClose: () => void
  onSaved: (t: TaskRow) => void
}) {
  const { revalidate } = useRevalidator()
  const subtasks = task.subRows ?? []
  const ownerMember =
    workspaceUsers.find((wu) => wu.user_id === task.created_by) ?? null
  const ownerDisplay = ownerMember ? resolveUserDisplayName(ownerMember) : null

  const [draft, setDraft] = React.useState(() => ({
    title: task.title,
    status: task.status as string,
    priority: (task.priority ?? "Medium") as string,
    due_date: toDateInputValue(task.due_date),
    estimated_hours:
      task.estimated_hours != null ? String(task.estimated_hours) : "",
    description: task.description ?? "",
    assignee_user_id: task.assignee_user_id ?? "",
    billable: task.billable,
    client_visible: task.client_visible,
    blocked: task.blocked,
  }))
  const [saving, setSaving] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [activityItems, setActivityItems] = React.useState<TaskActivityEntry[]>(
    []
  )
  const [activityBody, setActivityBody] = React.useState("")
  const [sendingActivity, setSendingActivity] = React.useState(false)
  const [detailsOpen, setDetailsOpen] = React.useState(true)
  const [subtasksOpen, setSubtasksOpen] = React.useState(true)

  React.useEffect(() => {
    setDraft({
      title: task.title,
      status: task.status as string,
      priority: (task.priority ?? "Medium") as string,
      due_date: toDateInputValue(task.due_date),
      estimated_hours:
        task.estimated_hours != null ? String(task.estimated_hours) : "",
      description: task.description ?? "",
      assignee_user_id: task.assignee_user_id ?? "",
      billable: task.billable,
      client_visible: task.client_visible,
      blocked: task.blocked,
    })
  }, [task.id])

  React.useEffect(() => {
    supabase
      .from("task_activity")
      .select("id,task_id,type,created_at,payload")
      .eq("task_id", task.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setActivityItems((data ?? []) as TaskActivityEntry[])
      })
  }, [task.id])

  async function handleSave() {
    setSaving(true)
    const { error } = await supabase
      .from("tasks")
      .update({
        title: draft.title,
        status: draft.status,
        priority: draft.priority,
        due_date: draft.due_date || null,
        estimated_hours: draft.estimated_hours
          ? Number(draft.estimated_hours)
          : null,
        description: draft.description || null,
        assignee_user_id:
          draft.assignee_user_id && draft.assignee_user_id !== "__none__"
            ? draft.assignee_user_id
            : null,
        billable: draft.billable,
        client_visible: draft.client_visible,
        blocked: draft.blocked,
      })
      .eq("id", task.id)
    setSaving(false)
    if (error) {
      toast.error("Failed to save task")
    } else {
      toast.success("Task saved")
      const resolvedAssigneeId =
        draft.assignee_user_id && draft.assignee_user_id !== "__none__"
          ? draft.assignee_user_id
          : null
      const updatedAssigneeEmail = resolvedAssigneeId
        ? (workspaceUsers.find((wu) => wu.user_id === resolvedAssigneeId)
            ?.email ?? null)
        : null

      // Log activity entries for changed fields
      const {
        data: { session: saveSession },
      } = await supabase.auth.getSession()
      if (saveSession) {
        const actor = {
          id: saveSession.user.id,
          name: saveSession.user.user_metadata?.full_name ?? null,
          email: saveSession.user.email ?? null,
        }
        const activityLogs: Array<Record<string, unknown>> = []
        if (draft.status !== task.status) {
          activityLogs.push({
            task_id: task.id,
            type: "status_changed",
            payload: {
              actor,
              field: "status",
              from: task.status,
              to: draft.status,
            },
          })
        }
        if (draft.priority !== (task.priority ?? "Medium")) {
          activityLogs.push({
            task_id: task.id,
            type: "task_updated",
            payload: {
              actor,
              field: "priority",
              from: task.priority,
              to: draft.priority,
            },
          })
        }
        if (draft.title !== task.title) {
          activityLogs.push({
            task_id: task.id,
            type: "task_updated",
            payload: {
              actor,
              field: "title",
              from: task.title,
              to: draft.title,
            },
          })
        }
        if (draft.assignee_user_id !== (task.assignee_user_id ?? "")) {
          activityLogs.push({
            task_id: task.id,
            type: "task_updated",
            payload: {
              actor,
              field: "assignee",
              to:
                updatedAssigneeEmail ??
                (resolvedAssigneeId ? "someone" : "unassigned"),
            },
          })
        }
        if (activityLogs.length === 0) {
          activityLogs.push({
            task_id: task.id,
            type: "task_updated",
            payload: { actor },
          })
        }
        await supabase.from("task_activity").insert(activityLogs)
        const { data: freshActivity } = await supabase
          .from("task_activity")
          .select("id,task_id,type,created_at,payload")
          .eq("task_id", task.id)
          .order("created_at", { ascending: true })
        if (freshActivity)
          setActivityItems(freshActivity as TaskActivityEntry[])
      }

      onSaved({
        ...task,
        title: draft.title,
        status: draft.status as TaskStatus,
        priority: draft.priority as TaskPriority,
        due_date: draft.due_date || null,
        estimated_hours: draft.estimated_hours
          ? Number(draft.estimated_hours)
          : null,
        description: draft.description || null,
        assignee_user_id: resolvedAssigneeId,
        assignee_email: updatedAssigneeEmail,
        billable: draft.billable,
        client_visible: draft.client_visible,
        blocked: draft.blocked,
      })
      revalidate()
    }
  }

  async function handleMarkComplete() {
    const { error } = await supabase
      .from("tasks")
      .update({ status: "Complete" })
      .eq("id", task.id)
    if (error) {
      toast.error("Failed to update status")
    } else {
      const {
        data: { session: cs },
      } = await supabase.auth.getSession()
      if (cs) {
        await supabase.from("task_activity").insert({
          task_id: task.id,
          type: "status_changed",
          payload: {
            actor: {
              id: cs.user.id,
              name: cs.user.user_metadata?.full_name ?? null,
              email: cs.user.email ?? null,
            },
            field: "status",
            from: task.status,
            to: "Complete",
          },
        })
        const { data: freshActivity } = await supabase
          .from("task_activity")
          .select("id,task_id,type,created_at,payload")
          .eq("task_id", task.id)
          .order("created_at", { ascending: true })
        if (freshActivity)
          setActivityItems(freshActivity as TaskActivityEntry[])
      }
      setDraft((d) => ({ ...d, status: "Complete" }))
      onSaved({ ...task, status: "Complete" })
      revalidate()
      toast.success("Task marked complete")
    }
  }

  async function handleDelete() {
    setDeleting(true)
    for (const sub of subtasks) {
      await supabase.from("tasks").delete().eq("id", sub.id)
    }
    const { error } = await supabase.from("tasks").delete().eq("id", task.id)
    setDeleting(false)
    if (error) {
      toast.error("Failed to delete task")
    } else {
      toast.success("Task deleted")
      onClose()
      revalidate()
    }
  }

  async function handleSendActivity() {
    if (!activityBody.trim()) return

    setSendingActivity(true)
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      setSendingActivity(false)
      toast.error("You must be signed in to post activity")
      return
    }

    const actor = {
      id: session.user.id,
      name: session.user.user_metadata?.full_name ?? null,
      email: session.user.email ?? null,
      avatar_url: session.user.user_metadata?.avatar_url ?? null,
    }

    const message = activityBody.trim()
    const { data, error } = await supabase
      .from("task_activity")
      .insert({
        task_id: task.id,
        type: "comment.created",
        payload: {
          actor,
          entity: {
            type: "task",
            id: task.id,
            name: message,
          },
        },
      })
      .select("id,task_id,type,created_at,payload")
      .single()

    setSendingActivity(false)

    if (error) {
      toast.error("Failed to post activity", { description: error.message })
      return
    }

    if (data) {
      setActivityItems((prev) => [...prev, data as TaskActivityEntry])
    }
    setActivityBody("")
    toast.success("Activity posted")
  }

  const isDone = draft.status === "Complete" || draft.status === "Cancelled"
  const resolvedAssigneeId =
    draft.assignee_user_id && draft.assignee_user_id !== "__none__"
      ? draft.assignee_user_id
      : null
  const assigneeMember = resolvedAssigneeId
    ? (workspaceUsers.find((wu) => wu.user_id === resolvedAssigneeId) ?? null)
    : null
  const displayAssignee = assigneeMember
    ? resolveUserDisplayName(assigneeMember)
    : "—"
  const showRightMeta = !listVisible

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-card">
      {/* ── Header ── */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-card px-4">
        <Button
          variant="ghost"
          size="icon"
          className="-ml-1 size-7"
          onClick={onToggleList}
          aria-label={listVisible ? "Expand task panel" : "Split panel view"}
        >
          {listVisible ? (
            <IconLayoutSidebarRightExpand className="size-4" />
          ) : (
            <IconLayoutSidebarRightCollapse className="size-4" />
          )}
        </Button>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/tasks">Tasks</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage className="max-w-48 truncate">
                {task.title}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleMarkComplete}
            disabled={isDone}
          >
            Mark Complete
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete Task"}
          </Button>
          <ModeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={onClose}
            aria-label="Close task"
          >
            <IconX className="size-4" />
          </Button>
        </div>
      </header>

      {/* ── Two-column body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main editable content */}
        <ScrollArea className="flex-1 bg-card">
          <div className="space-y-6 p-6">
            {/* Editable title */}
            <div className="rounded-lg border px-4 py-3">
              <input
                className="w-full bg-transparent text-2xl font-semibold text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-0"
                value={draft.title}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, title: e.target.value }))
                }
                placeholder="Task title"
              />

              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Status</Label>
                  <Select
                    value={draft.status}
                    onValueChange={(v) =>
                      setDraft((d) => ({ ...d, status: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        [
                          "Todo",
                          "Upcoming",
                          "In Progress",
                          "In Review",
                          "Awaiting Client",
                          "On Hold",
                          "Complete",
                          "Cancelled",
                        ] as TaskStatus[]
                      ).map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Priority</Label>
                  <Select
                    value={draft.priority}
                    onValueChange={(v) =>
                      setDraft((d) => ({ ...d, priority: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="— None —" />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        ["Normal", "Medium", "High", "Urgent"] as TaskPriority[]
                      ).map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Due date</Label>
                  <Input
                    type="date"
                    value={draft.due_date}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, due_date: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Content tabs */}
            <Tabs defaultValue="details">
              <TabsList className="w-full">
                <TabsTrigger value="details" className="flex-1">
                  Task Details
                </TabsTrigger>
                <TabsTrigger value="activity" className="flex-1">
                  Activity
                </TabsTrigger>
                <TabsTrigger value="files" className="flex-1">
                  Files
                </TabsTrigger>
              </TabsList>

              {/* Task Details — read-only description */}
              <TabsContent value="details" className="mt-4">
                <div className="rounded-lg border">
                  <Collapsible
                    open={detailsOpen}
                    onOpenChange={setDetailsOpen}
                    className="border-b"
                  >
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between px-4 py-3 text-left"
                      >
                        <span className="text-sm font-semibold">
                          Task Details
                        </span>
                        <ChevronDown
                          className={`size-4 transition-transform ${detailsOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="min-h-55 p-4 pt-0">
                        <Textarea
                          id="task-description"
                          value={draft.description}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              description: e.target.value,
                            }))
                          }
                          placeholder="Add task details..."
                          rows={8}
                          className="min-h-55"
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <Collapsible
                    open={subtasksOpen}
                    onOpenChange={setSubtasksOpen}
                  >
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between px-4 py-3 text-left"
                      >
                        <span className="text-sm font-semibold">Sub Tasks</span>
                        <ChevronDown
                          className={`size-4 transition-transform ${subtasksOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="p-4 pt-0">
                        {subtasks.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No subtasks yet.
                          </p>
                        ) : (
                          <div className="overflow-hidden rounded-md border">
                            {subtasks.map((s) => (
                              <div
                                key={s.id}
                                className="flex items-center gap-2 border-b px-3 py-2 text-sm last:border-b-0"
                              >
                                <span className="shrink-0">
                                  {statusIcon[s.status]}
                                </span>
                                <span className="min-w-0 flex-1 truncate text-foreground">
                                  {s.title}
                                </span>
                                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                                  {formatDate(s.due_date)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </TabsContent>

              {/* Activity */}
              <TabsContent value="activity" className="mt-4">
                <div className="rounded-lg border p-4">
                  <div className="mb-4 space-y-2">
                    <Label htmlFor="task-activity-message">Post Activity</Label>
                    <Textarea
                      id="task-activity-message"
                      value={activityBody}
                      onChange={(e) => setActivityBody(e.target.value)}
                      placeholder="Write an activity note..."
                      rows={4}
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={handleSendActivity}
                        disabled={!activityBody.trim() || sendingActivity}
                      >
                        {sendingActivity ? "Posting…" : "Post"}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-0">
                    {activityItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-2 rounded-md border py-8 text-center">
                        <IconMessage className="size-6 text-muted-foreground opacity-40" />
                        <p className="text-sm text-muted-foreground">
                          No activity yet
                        </p>
                      </div>
                    ) : (
                      <ul className="space-y-3">
                        {activityItems.map((entry, idx) => {
                          const payload = toRec(entry.payload)
                          const actorName = resolveActivityActor(
                            payload,
                            workspaceUsers
                          )
                          const actorId =
                            readStr(toRec(payload.actor), ["id"]) ??
                            readStr(payload, [
                              "actor_user_id",
                              "user_id",
                              "created_by",
                            ])
                          const actorMember = actorId
                            ? workspaceUsers.find(
                                (wu) => wu.user_id === actorId
                              )
                            : undefined
                          const actorAvatar =
                            readStr(toRec(payload.actor), ["avatar_url"]) ??
                            actorMember?.avatar_url ??
                            ""
                          const isComment =
                            entry.type === "comment_added" ||
                            entry.type === "comment.created"
                          const commentBody = isComment
                            ? (readStr(toRec(payload.entity), ["name"]) ??
                              readStr(payload, ["body", "comment"]))
                            : null
                          const actionText = isComment
                            ? null
                            : formatEventAction(entry.type, payload)
                          const isLast = idx === activityItems.length - 1

                          return (
                            <li
                              key={entry.id}
                              className="relative grid grid-cols-[28px_minmax(0,1fr)_auto] items-start gap-2"
                            >
                              {/* connector line */}
                              <div className="relative flex justify-center">
                                {!isLast && (
                                  <span className="absolute top-3 bottom-[-12px] w-px bg-border" />
                                )}
                                {isComment ? (
                                  <Avatar className="relative z-10 mt-0.5 h-6 w-6">
                                    <AvatarImage src={actorAvatar} />
                                    <AvatarFallback className="text-[10px] font-semibold">
                                      {actorName.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                ) : (
                                  <span className="relative z-10 mt-2 h-2 w-2 rounded-full border border-border bg-muted-foreground/40" />
                                )}
                              </div>

                              {isComment ? (
                                <div className="rounded-lg border bg-muted/30 px-3 py-2">
                                  <p className="text-sm">
                                    <span className="font-semibold text-foreground">
                                      {actorName}
                                    </span>{" "}
                                    <span className="text-muted-foreground">
                                      posted a note
                                    </span>
                                  </p>
                                  <p className="mt-1 text-sm whitespace-pre-wrap text-foreground">
                                    {commentBody}
                                  </p>
                                </div>
                              ) : (
                                <p className="pt-0.5 text-sm leading-6 text-foreground">
                                  <span className="font-semibold">
                                    {actorName}
                                  </span>{" "}
                                  <span className="text-muted-foreground">
                                    {actionText}
                                  </span>
                                </p>
                              )}

                              <time className="pt-0.5 text-xs text-muted-foreground">
                                {relativeActivityTime(entry.created_at)}
                              </time>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Files */}
              <TabsContent value="files" className="mt-4">
                <div className="rounded-lg border p-4">
                  <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                    <IconPaperclip className="size-8 text-muted-foreground opacity-40" />
                    <p className="text-sm text-muted-foreground">
                      No files attached
                    </p>
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <IconUpload className="size-3.5" />
                      Upload File
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>

        {/* Right sidebar — live metadata */}
        {showRightMeta && (
          <ScrollArea className="w-70 shrink-0 border-l bg-sidebar">
            <div className="flex flex-col divide-y text-sm">
              {/* Files */}
              <section className="p-4">
                <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Files
                </p>
                <p className="mb-3 flex items-center gap-1.5 text-muted-foreground">
                  <IconPaperclip className="size-3.5" />
                  No files attached
                </p>
                <Button size="sm" variant="outline" className="w-full gap-1.5">
                  <IconUpload className="size-3.5" />
                  Upload File
                </Button>
              </section>

              {/* Status */}
              <section className="flex items-center justify-between px-4 py-3">
                <span className="text-muted-foreground">Status</span>
                <Badge
                  variant="outline"
                  className="gap-1.5 px-2 text-muted-foreground"
                >
                  {statusIcon[draft.status as TaskStatus]}
                  {draft.status}
                </Badge>
              </section>

              {/* Priority */}
              <section className="flex items-center justify-between px-4 py-3">
                <span className="text-muted-foreground">Priority</span>
                {draft.priority ? (
                  <Badge variant={priorityVariant[draft.priority] ?? "outline"}>
                    {draft.priority}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </section>

              {/* Owner */}
              <section className="flex items-center justify-between px-4 py-3">
                <span className="text-muted-foreground">Owner</span>
                <span className="text-foreground">{ownerDisplay ?? "—"}</span>
              </section>

              {/* Assigned To */}
              <section className="flex items-center justify-between px-4 py-3">
                <span className="text-muted-foreground">Assigned To</span>
                <span className="text-foreground">{displayAssignee}</span>
              </section>

              {/* Due Date */}
              <section className="flex items-center justify-between px-4 py-3">
                <span className="text-muted-foreground">Due Date</span>
                <span className="text-foreground tabular-nums">
                  {formatDate(draft.due_date || null)}
                </span>
              </section>

              {/* Logged Time */}
              <section className="flex items-center justify-between px-4 py-3">
                <span className="text-muted-foreground">Logged Time</span>
                <span className="text-foreground tabular-nums">00:00:00</span>
              </section>
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const {
    tasks,
    workspaceUsers,
    inboxUnreadCount,
    activityUnreadCount,
    workspaces,
    user,
    activeWorkspaceId,
    currentUserRole,
    parentFilterTitle,
  } = useLoaderData<typeof clientLoader>()

  const [selected, setSelected] = React.useState<TaskRow | null>(null)
  const [listVisible, setListVisible] = React.useState(true)
  const [showCompleted, setShowCompleted] = React.useState(false)

  const visibleTasks = React.useMemo(
    () =>
      showCompleted ? tasks : tasks.filter((t) => t.status !== "Complete"),
    [tasks, showCompleted]
  )

  React.useEffect(() => {
    if (!selected) return
    if (!showCompleted && selected.status === "Complete") {
      setSelected(null)
      setListVisible(true)
    }
  }, [selected, showCompleted])

  function handleSelect(task: TaskRow) {
    setSelected(task)
    setListVisible(false)
  }

  return (
    <SidebarProvider>
      <AppSidebar
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        user={user}
        currentUserRole={currentUserRole}
        inboxUnreadCount={inboxUnreadCount}
        activityUnreadCount={activityUnreadCount}
      />
      <SidebarInset className="overflow-hidden">
        <div className="flex h-full overflow-hidden">
          {/* ── Left: task list ── */}
          {listVisible && (
            <div
              className={`flex shrink-0 flex-col overflow-hidden border-r ${selected ? "w-1/2" : "flex-1"}`}
            >
              <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator
                  orientation="vertical"
                  className="mr-2 data-[orientation=vertical]:h-4"
                />
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href="/tasks">Tasks</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>
                        {parentFilterTitle ?? "All Tasks"}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
                <div className="ml-auto flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowCompleted((v) => !v)}
                  >
                    {showCompleted ? "Hide Completed" : "Show Completed"}
                  </Button>
                  <Badge variant="secondary" className="tabular-nums">
                    {visibleTasks.length}
                  </Badge>
                  <ModeToggle />
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                <TasksDataTable
                  tasks={visibleTasks}
                  selectedId={selected?.id}
                  onSelect={handleSelect}
                />
              </div>
            </div>
          )}

          {/* ── Right: task detail ── */}
          {selected && (
            <TaskDetail
              task={selected}
              workspaceUsers={workspaceUsers as WorkspaceUser[]}
              listVisible={listVisible}
              onToggleList={() => setListVisible((v) => !v)}
              onClose={() => {
                setSelected(null)
                setListVisible(true)
              }}
              onSaved={setSelected}
            />
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
