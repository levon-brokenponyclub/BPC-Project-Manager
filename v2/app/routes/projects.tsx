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
import { Textarea } from "~/components/ui/textarea"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar"
import {
  IconFolderOpen,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconX,
} from "@tabler/icons-react"
import { AppSidebar } from "~/components/app-sidebar"
import { supabase } from "~/lib/supabase"
import { resolveWorkspaceId } from "~/lib/activeWorkspace"

// ─── Types ────────────────────────────────────────────────────────────────────

type ProjectStatus = "Active" | "On Hold" | "Complete" | "Archived"

interface ProjectRow {
  id: string
  workspace_id: string
  name: string
  description: string | null
  status: ProjectStatus
  created_by: string | null
  created_at: string
  updated_at: string
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

  const MESSAGE_TYPES = ["message.direct", "message.reply", "message.mention"]

  if (!activeWorkspaceId) {
    return {
      projects: [] as ProjectRow[],
      inboxUnreadCount: 0,
      activityUnreadCount: 0,
      workspaces,
      user,
      activeWorkspaceId,
      currentUserRole: null as string | null,
    }
  }

  const [projectResult, inboxResult, activityResult, membersResult] =
    await Promise.all([
      supabase
        .from("projects")
        .select("*")
        .eq("workspace_id", activeWorkspaceId)
        .order("created_at", { ascending: false }),
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
      supabase.rpc("get_workspace_users_with_emails", {
        workspace_id_param: activeWorkspaceId,
      }),
    ])

  const members = (membersResult.data ?? []) as {
    user_id: string
    role?: string | null
  }[]
  const currentUserRole =
    members.find((m) => m.user_id === session.user.id)?.role ?? null

  if (currentUserRole === "viewer") {
    return redirect(`/sprint-dashboard?ws=${activeWorkspaceId}`)
  }

  return {
    projects: (projectResult.data ?? []) as ProjectRow[],
    inboxUnreadCount: inboxResult.count ?? 0,
    activityUnreadCount: activityResult.count ?? 0,
    workspaces,
    user,
    activeWorkspaceId,
    currentUserRole,
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const statusVariant: Record<
  ProjectStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  Active: "default",
  "On Hold": "secondary",
  Complete: "outline",
  Archived: "secondary",
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

// ─── Project detail panel ────────────────────────────────────────────────────

function ProjectDetail({
  project,
  listVisible,
  onToggleList,
  onClose,
  onSaved,
}: {
  project: ProjectRow
  listVisible: boolean
  onToggleList: () => void
  onClose: () => void
  onSaved: (p: ProjectRow) => void
}) {
  const { revalidate } = useRevalidator()

  const [draft, setDraft] = React.useState({
    name: project.name,
    description: project.description ?? "",
    status: project.status as string,
  })
  const [saving, setSaving] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  React.useEffect(() => {
    setDraft({
      name: project.name,
      description: project.description ?? "",
      status: project.status as string,
    })
  }, [project.id])

  async function handleSave() {
    setSaving(true)
    const { error } = await supabase
      .from("projects")
      .update({
        name: draft.name,
        description: draft.description || null,
        status: draft.status,
      })
      .eq("id", project.id)
    setSaving(false)
    if (error) {
      toast.error("Failed to save project")
    } else {
      toast.success("Project saved")
      onSaved({
        ...project,
        name: draft.name,
        description: draft.description || null,
        status: draft.status as ProjectStatus,
      })
      revalidate()
    }
  }

  async function handleDelete() {
    setDeleting(true)
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", project.id)
    setDeleting(false)
    if (error) {
      toast.error("Failed to delete project")
    } else {
      toast.success("Project deleted")
      onClose()
      revalidate()
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* ── Header ── */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <Button
          variant="ghost"
          size="icon"
          className="-ml-1 size-7"
          onClick={onToggleList}
          aria-label={
            listVisible ? "Collapse project list" : "Expand project list"
          }
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
              <BreadcrumbLink href="/projects">Projects</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage className="max-w-48 truncate">
                {project.name}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete Project"}
          </Button>
          <ModeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={onClose}
            aria-label="Close project"
          >
            <IconX className="size-4" />
          </Button>
        </div>
      </header>

      {/* ── Body ── */}
      <ScrollArea className="flex-1">
        <div className="space-y-6 p-6">
          {/* Editable name */}
          <div className="rounded-lg border px-4 py-3">
            <input
              className="w-full bg-transparent text-2xl font-semibold text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-0"
              value={draft.name}
              onChange={(e) =>
                setDraft((d) => ({ ...d, name: e.target.value }))
              }
              placeholder="Project name"
            />
          </div>

          {/* Fields */}
          <div className="space-y-4 rounded-lg border p-4">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Fields
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Status</Label>
                <Select
                  value={draft.status}
                  onValueChange={(v) => setDraft((d) => ({ ...d, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      [
                        "Active",
                        "On Hold",
                        "Complete",
                        "Archived",
                      ] as ProjectStatus[]
                    ).map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Created</Label>
                <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground">
                  {formatDate(project.created_at)}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Description</Label>
              <Textarea
                value={draft.description}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, description: e.target.value }))
                }
                placeholder="No description yet."
                rows={8}
                className="resize-none"
              />
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const {
    projects,
    inboxUnreadCount,
    activityUnreadCount,
    workspaces,
    user,
    activeWorkspaceId,
    currentUserRole,
  } = useLoaderData<typeof clientLoader>()

  const [selected, setSelected] = React.useState<ProjectRow | null>(null)
  const [listVisible, setListVisible] = React.useState(true)

  function handleSelect(project: ProjectRow) {
    setSelected(project)
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
          {/* ── Left: project list ── */}
          {listVisible && (
            <div
              className={`flex shrink-0 flex-col overflow-hidden border-r ${selected ? "w-96" : "flex-1"}`}
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
                      <BreadcrumbLink href="/projects">Projects</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>All Projects</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
                <div className="ml-auto flex items-center gap-2">
                  <Badge variant="secondary" className="tabular-nums">
                    {projects.length}
                  </Badge>
                  <ModeToggle />
                </div>
              </div>

              <ScrollArea className="flex-1">
                {projects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                    <IconFolderOpen className="size-10 text-muted-foreground opacity-30" />
                    <p className="text-sm text-muted-foreground">
                      No projects yet. Use Quick Create to add one.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col divide-y">
                    {projects.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleSelect(p)}
                        className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${selected?.id === p.id ? "bg-muted" : ""}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium text-foreground">
                            {p.name}
                          </span>
                          <Badge
                            variant={statusVariant[p.status]}
                            className="shrink-0 text-xs"
                          >
                            {p.status}
                          </Badge>
                        </div>
                        {p.description && (
                          <p className="line-clamp-2 text-xs text-muted-foreground">
                            {p.description}
                          </p>
                        )}
                        <span className="text-xs text-muted-foreground/60">
                          Created {formatDate(p.created_at)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          {/* ── Right: project detail ── */}
          {selected && (
            <ProjectDetail
              project={selected}
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
