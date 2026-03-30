import {
  redirect,
  useLoaderData,
  type ClientLoaderFunctionArgs,
} from "react-router"
import { ModeToggle } from "~/components/mode-toggle"
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
import { AppSidebar } from "~/components/app-sidebar"
import { supabase } from "~/lib/supabase"
import { TasksDataTable } from "~/features/tasks/components/TasksDataTable"
import { TaskStatCards } from "~/features/tasks/components/TaskStatCards"
import { resolveWorkspaceId } from "~/lib/activeWorkspace"

import type { TaskRow } from "~/features/tasks/types"

// ─── Loader ───────────────────────────────────────────────────────────────────
export async function clientLoader({ request }: ClientLoaderFunctionArgs) {
  try {
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

    if (!activeWorkspaceId)
      return {
        tasks: [] as TaskRow[],
        inboxUnreadCount: 0,
        activityUnreadCount: 0,
        workspaces,
        user,
        activeWorkspaceId,
        currentUserRole: null as string | null,
      }

    const [taskResult, inboxResult, activityResult] = await Promise.all([
      supabase
        .from("tasks")
        .select("*")
        .eq("workspace_id", activeWorkspaceId)
        .is("parent_task_id", null)
        .order("updated_at", { ascending: false }),
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

    const { data: workspaceUsers } = await supabase.rpc(
      "get_workspace_users_with_emails",
      { workspace_id_param: activeWorkspaceId }
    )
    const currentUserRole =
      (workspaceUsers ?? []).find(
        (wu: { user_id: string; role?: string | null }) =>
          wu.user_id === session.user.id
      )?.role ?? null

    if (currentUserRole === "viewer") {
      return redirect(`/sprint-dashboard?ws=${activeWorkspaceId}`)
    }

    if (error || !taskRows?.length)
      return {
        tasks: [] as TaskRow[],
        inboxUnreadCount,
        activityUnreadCount,
        workspaces,
        user,
        activeWorkspaceId,
        currentUserRole,
      }

    const userMap = new Map<string, string>()
    ;(workspaceUsers ?? []).forEach(
      (wu: { user_id: string; email: string }) => {
        if (wu.user_id && wu.email) userMap.set(wu.user_id, wu.email)
      }
    )

    const tasks: TaskRow[] = taskRows.map((t: Record<string, unknown>) => ({
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

    return {
      tasks,
      inboxUnreadCount,
      activityUnreadCount,
      workspaces,
      user,
      activeWorkspaceId,
      currentUserRole,
    }
  } catch (error) {
    console.error("[home.clientLoader] Failed to load dashboard:", error)

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return redirect("/login")

    return {
      tasks: [] as TaskRow[],
      inboxUnreadCount: 0,
      activityUnreadCount: 0,
      workspaces: [] as { id: string; name: string }[],
      user: {
        name: session.user.user_metadata?.full_name ?? session.user.email ?? "",
        email: session.user.email ?? "",
        avatar: session.user.user_metadata?.avatar_url ?? "",
      },
      activeWorkspaceId: null as string | null,
      currentUserRole: null as string | null,
    }
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const {
    tasks,
    inboxUnreadCount,
    activityUnreadCount,
    workspaces,
    user,
    activeWorkspaceId,
    currentUserRole,
  } = useLoaderData<typeof clientLoader>()
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId)

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
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    {activeWorkspace?.name ?? "Tasks"}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <ModeToggle className="mr-2 ml-auto" />
        </header>
        <div className="flex flex-1 flex-col gap-4 px-6 py-4 pt-0">
          <TaskStatCards
            tasks={tasks}
            inboxUnreadCount={inboxUnreadCount}
            activityUnreadCount={activityUnreadCount}
          />
          <div className="rounded-xl border bg-background">
            <TasksDataTable tasks={tasks} />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
