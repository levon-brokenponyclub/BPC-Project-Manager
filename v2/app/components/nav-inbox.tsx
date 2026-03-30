import * as React from "react"
import { Link, useNavigate, useSearchParams } from "react-router"
import { ChevronRight, Inbox, PlusCircle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "~/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "~/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { Textarea } from "~/components/ui/textarea"
import { supabase } from "~/lib/supabase"
import type { TaskStatus, TaskPriority } from "~/features/tasks/types"

interface WorkspaceUser {
  user_id: string
  email: string
  full_name?: string | null
}

interface NavInboxProps {
  unreadCount?: number
  activeWorkspaceId?: string
}

const TASK_STATUSES: TaskStatus[] = [
  "Todo",
  "Upcoming",
  "In Progress",
  "In Review",
  "Awaiting Client",
  "On Hold",
  "Complete",
  "Cancelled",
]

const TASK_PRIORITIES: TaskPriority[] = ["Normal", "Medium", "High", "Urgent"]

export function NavInbox({
  unreadCount = 0,
  activeWorkspaceId,
}: NavInboxProps) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const ws = searchParams.get("ws")
  const inboxHref = ws ? `/inbox?ws=${ws}` : "/inbox"
  const [inboxOpen, setInboxOpen] = React.useState(false)

  function withWs(url: string) {
    if (!ws) return url
    return url.includes("?") ? `${url}&ws=${ws}` : `${url}?ws=${ws}`
  }

  const [open, setOpen] = React.useState(false)
  const [users, setUsers] = React.useState<WorkspaceUser[]>([])
  const [submitting, setSubmitting] = React.useState(false)

  // ── Task form ──────────────────────────────────────────────────────────────
  const [taskTitle, setTaskTitle] = React.useState("")
  const [taskStatus, setTaskStatus] = React.useState<TaskStatus>("Todo")
  const [taskPriority, setTaskPriority] = React.useState("__none__")
  const [taskDueDate, setTaskDueDate] = React.useState("")
  const [taskAssigneeId, setTaskAssigneeId] = React.useState("__none__")
  const [taskProjectId, setTaskProjectId] = React.useState("__none__")

  // ── Project list (for task selector) ──────────────────────────────────────
  const [projectList, setProjectList] = React.useState<
    { id: string; name: string }[]
  >([])

  // ── Project form ───────────────────────────────────────────────────────────
  const [projectName, setProjectName] = React.useState("")
  const [projectDescription, setProjectDescription] = React.useState("")

  // ── Message form ───────────────────────────────────────────────────────────
  const [recipientId, setRecipientId] = React.useState("__none__")
  const [body, setBody] = React.useState("")

  // Fetch workspace users + project list when dialog opens
  React.useEffect(() => {
    if (!open || !activeWorkspaceId) return
    supabase
      .rpc("get_workspace_users_with_emails", {
        workspace_id_param: activeWorkspaceId,
      })
      .then(({ data }) => setUsers((data ?? []) as WorkspaceUser[]))
    supabase
      .from("projects")
      .select("id, name")
      .eq("workspace_id", activeWorkspaceId)
      .order("created_at", { ascending: true })
      .then(({ data }) =>
        setProjectList((data ?? []) as { id: string; name: string }[])
      )
  }, [open, activeWorkspaceId])

  function resetAll() {
    setTaskTitle("")
    setTaskStatus("Todo")
    setTaskPriority("__none__")
    setTaskDueDate("")
    setTaskAssigneeId("__none__")
    setTaskProjectId("__none__")
    setProjectName("")
    setProjectDescription("")
    setRecipientId("__none__")
    setBody("")
  }

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) resetAll()
  }

  async function getActor() {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return null
    return {
      id: session.user.id,
      name: session.user.user_metadata?.full_name ?? null,
      email: session.user.email ?? null,
      avatar_url: session.user.user_metadata?.avatar_url ?? null,
    }
  }

  // ── Create task ────────────────────────────────────────────────────────────
  async function handleCreateTask() {
    if (!taskTitle.trim() || !activeWorkspaceId) return
    setSubmitting(true)
    const actor = await getActor()
    if (!actor) {
      setSubmitting(false)
      return
    }

    const { error } = await supabase.from("tasks").insert({
      workspace_id: activeWorkspaceId,
      title: taskTitle.trim(),
      status: taskStatus,
      priority: taskPriority === "__none__" ? null : taskPriority,
      due_date: taskDueDate || null,
      assignee_user_id: taskAssigneeId === "__none__" ? null : taskAssigneeId,
      project_id: taskProjectId === "__none__" ? null : taskProjectId,
      created_by: actor.id,
    })

    setSubmitting(false)

    if (error) {
      toast.error("Failed to create task", { description: error.message })
    } else {
      toast.success("Task created")
      handleOpenChange(false)
      const qs = ws
        ? `?ws=${ws}`
        : activeWorkspaceId
          ? `?ws=${activeWorkspaceId}`
          : ""
      navigate(`/tasks${qs}`)
    }
  }

  // ── Create project ─────────────────────────────────────────────────────────
  async function handleCreateProject() {
    if (!projectName.trim() || !activeWorkspaceId) return
    setSubmitting(true)
    const actor = await getActor()
    if (!actor) {
      setSubmitting(false)
      return
    }

    const { error } = await supabase.from("projects").insert({
      workspace_id: activeWorkspaceId,
      name: projectName.trim(),
      description: projectDescription.trim() || null,
      created_by: actor.id,
    })

    setSubmitting(false)

    if (error) {
      toast.error("Failed to create project", { description: error.message })
    } else {
      toast.success("Project created")
      handleOpenChange(false)
      const qs = ws
        ? `?ws=${ws}`
        : activeWorkspaceId
          ? `?ws=${activeWorkspaceId}`
          : ""
      navigate(`/projects${qs}`)
    }
  }

  // ── Send message ───────────────────────────────────────────────────────────
  async function handleSend() {
    if (recipientId === "__none__" || !body.trim() || !activeWorkspaceId) return
    setSubmitting(true)
    const actor = await getActor()
    if (!actor) {
      setSubmitting(false)
      return
    }

    const { error } = await supabase.from("notifications").insert({
      workspace_id: activeWorkspaceId,
      user_id: recipientId,
      type: "message.direct",
      payload: {
        actor,
        entity: { type: "message", name: body.trim() },
      },
    })

    setSubmitting(false)

    if (error) {
      toast.error("Failed to send message", { description: error.message })
    } else {
      toast.success("Message sent")
      handleOpenChange(false)
    }
  }

  return (
    <>
      {/* Row 1: Quick Create */}
      <SidebarMenuItem>
        <SidebarMenuButton onClick={() => setOpen(true)} tooltip="Quick Create">
          <PlusCircle />
          <span>Quick Create</span>
        </SidebarMenuButton>
      </SidebarMenuItem>

      {/* Row 2: Inbox with submenus */}
      <Collapsible asChild open={inboxOpen} onOpenChange={setInboxOpen}>
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton tooltip="Inbox" className="relative">
              <Inbox />
              <span>Inbox</span>
              {unreadCount > 0 && (
                <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-semibold text-primary-foreground group-data-[collapsible=icon]:hidden">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <SidebarMenuAction
            aria-hidden="true"
            className={`transition-transform ${inboxOpen ? "rotate-90" : ""}`}
          >
            <ChevronRight />
            <span className="sr-only">Toggle Inbox sections</span>
          </SidebarMenuAction>
          <CollapsibleContent>
            <SidebarMenuSub>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton asChild>
                  <Link
                    to={inboxHref}
                    className="flex w-full items-center justify-between"
                  >
                    <span>Inbox</span>
                    {unreadCount > 0 && (
                      <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-semibold text-primary-foreground">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton asChild>
                  <Link to={withWs("/inbox?box=sent")}>Sent</Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton asChild>
                  <Link to={withWs("/inbox?box=pinned")}>Pinned</Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton asChild>
                  <Link to={withWs("/inbox?box=archived")}>Archived</Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>

      {/* Quick Create dialog */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Quick Create</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="task">
            <TabsList className="w-full">
              <TabsTrigger value="task" className="flex-1">
                Task
              </TabsTrigger>
              <TabsTrigger value="project" className="flex-1">
                Project
              </TabsTrigger>
              <TabsTrigger value="message" className="flex-1">
                Message
              </TabsTrigger>
            </TabsList>

            {/* ── Task tab ─────────────────────────────────────────────────── */}
            <TabsContent value="task">
              <div className="flex flex-col gap-4 py-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="task-title">Title</Label>
                  <Input
                    id="task-title"
                    placeholder="Task title…"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>Status</Label>
                    <Select
                      value={taskStatus}
                      onValueChange={(v) => setTaskStatus(v as TaskStatus)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TASK_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-1.5">
                    <Label>Priority</Label>
                    <Select
                      value={taskPriority}
                      onValueChange={setTaskPriority}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {TASK_PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="task-due">Due date</Label>
                    <Input
                      id="task-due"
                      type="date"
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label>Assignee</Label>
                    <Select
                      value={taskAssigneeId}
                      onValueChange={setTaskAssigneeId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Unassigned</SelectItem>
                        {users.map((u) => (
                          <SelectItem key={u.user_id} value={u.user_id}>
                            {u.full_name
                              ? `${u.full_name} (${u.email})`
                              : u.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label>Project</Label>
                  <Select
                    value={taskProjectId}
                    onValueChange={setTaskProjectId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No project</SelectItem>
                      {projectList.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTask}
                  disabled={!taskTitle.trim() || submitting}
                >
                  {submitting ? "Creating…" : "Create Task"}
                </Button>
              </DialogFooter>
            </TabsContent>

            {/* ── Project tab ──────────────────────────────────────────────── */}
            <TabsContent value="project">
              <div className="flex flex-col gap-4 py-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="project-name">Name</Label>
                  <Input
                    id="project-name"
                    placeholder="Project name…"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="project-desc">Description</Label>
                  <Textarea
                    id="project-desc"
                    placeholder="Optional description…"
                    rows={4}
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateProject}
                  disabled={!projectName.trim() || submitting}
                >
                  {submitting ? "Creating…" : "Create Project"}
                </Button>
              </DialogFooter>
            </TabsContent>

            {/* ── Message tab ──────────────────────────────────────────────── */}
            <TabsContent value="message">
              <div className="flex flex-col gap-4 py-4">
                <Select value={recipientId} onValueChange={setRecipientId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select recipient…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Workspace members</SelectLabel>
                      {users.map((u) => (
                        <SelectItem key={u.user_id} value={u.user_id}>
                          {u.full_name
                            ? `${u.full_name} (${u.email})`
                            : u.email}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>

                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your message…"
                  rows={5}
                />
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={
                    recipientId === "__none__" || !body.trim() || submitting
                  }
                >
                  {submitting ? "Sending…" : "Send"}
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  )
}
