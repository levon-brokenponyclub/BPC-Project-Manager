import * as React from "react"
import {
  redirect,
  useLoaderData,
  useRevalidator,
  type ClientLoaderFunctionArgs,
} from "react-router"
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
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar"
import {
  IconCircleCheckFilled,
  IconCircleDashed,
  IconCircleX,
  IconClock,
  IconDownload,
  IconFile,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
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

function renderDescriptionWithLinks(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g)
  return parts.map((part, idx) => {
    if (/^https?:\/\//.test(part)) {
      return (
        <a
          key={`${part}-${idx}`}
          href={part}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          {part}
        </a>
      )
    }
    return <React.Fragment key={`txt-${idx}`}>{part}</React.Fragment>
  })
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
  const ownerEmail =
    workspaceUsers.find((wu) => wu.user_id === task.created_by)?.email ?? null

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

  const isDone = draft.status === "Complete" || draft.status === "Cancelled"
  const resolvedAssigneeId =
    draft.assignee_user_id && draft.assignee_user_id !== "__none__"
      ? draft.assignee_user_id
      : null
  const displayAssignee = resolvedAssigneeId
    ? (workspaceUsers
        .find((wu) => wu.user_id === resolvedAssigneeId)
        ?.email?.split("@")[0] ?? "—")
    : "—"

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* ── Header ── */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <Button
          variant="ghost"
          size="icon"
          className="-ml-1 size-7"
          onClick={onToggleList}
          aria-label={listVisible ? "Collapse task list" : "Expand task list"}
        >
          {listVisible ? (
            <IconLayoutSidebarLeftCollapse className="size-4" />
          ) : (
            <IconLayoutSidebarLeftExpand className="size-4" />
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
        <ScrollArea className="flex-1">
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
                <div className="rounded-lg border p-4">
                  {draft.description ? (
                    <div className="min-h-60 text-sm leading-7 wrap-break-word whitespace-pre-wrap text-foreground">
                      {renderDescriptionWithLinks(draft.description)}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No description yet.
                    </p>
                  )}
                </div>
              </TabsContent>

              {/* Activity */}
              <TabsContent value="activity" className="mt-4">
                <div className="rounded-lg border p-4">
                  <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                    <IconMessage className="size-8 text-muted-foreground opacity-40" />
                    <p className="text-sm text-muted-foreground">
                      No activity yet
                    </p>
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
        <ScrollArea className="w-70 shrink-0 border-l">
          <div className="flex flex-col divide-y text-sm">
            {/* Subtasks */}
            <section className="p-4">
              <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Sub Tasks
              </p>
              {subtasks.length === 0 ? (
                <p className="text-muted-foreground">No subtasks yet.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {subtasks.map((s) => (
                    <li key={s.id} className="flex items-center gap-2">
                      {statusIcon[s.status]}
                      <span className="flex-1 text-foreground">{s.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

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
              <span className="text-foreground">
                {ownerEmail ? ownerEmail.split("@")[0] : "—"}
              </span>
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
              className={`flex shrink-0 flex-col overflow-hidden border-r ${selected ? "w-140" : "flex-1"}`}
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
