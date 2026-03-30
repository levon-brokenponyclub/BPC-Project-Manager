import * as React from "react"

import { NavMain } from "~/components/nav-main"
import { NavInbox } from "~/components/nav-inbox"
import { NavUser } from "~/components/nav-user"
import { WorkspaceSwitcher } from "~/components/workspace-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
} from "~/components/ui/sidebar"
import {
  Bell,
  BookOpen,
  CheckSquare,
  FolderKanban,
  LayoutDashboard,
  Settings2,
} from "lucide-react"
import { supabase } from "~/lib/supabase"

// ─── Nav config ───────────────────────────────────────────────────────────────

const navMain = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
    isActive: true,
  },
  {
    title: "Activity",
    url: "/activity",
    icon: Bell,
    items: [
      { title: "Tasks", url: "/activity/tasks" },
      { title: "Comments", url: "/activity/comments" },
      { title: "Attachments", url: "/activity/attachments" },
      { title: "Assets", url: "/activity/assets" },
      { title: "Members", url: "/activity/members" },
    ],
  },
  {
    title: "Projects",
    url: "/projects",
    icon: FolderKanban,
    isActive: true,
    items: [] as { title: string; url: string }[],
  },
  {
    title: "Tasks",
    url: "/tasks",
    icon: CheckSquare,
    isActive: true,
    items: [] as { title: string; url: string }[],
  },
  {
    title: "Documentation",
    url: "#",
    icon: BookOpen,
    items: [
      { title: "Files", url: "/docs/files" },
      { title: "Links", url: "/docs/links" },
      { title: "Logins", url: "/docs/logins" },
      { title: "Plugins", url: "/docs/plugins" },
    ],
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings2,
    isActive: true,
    items: [
      { title: "Team", url: "/settings" },
      { title: "Billing", url: "/settings/billing" },
      { title: "General", url: "/settings/general" },
    ],
  },
]

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  workspaces?: { id: string; name: string }[]
  activeWorkspaceId?: string
  user?: { name: string; email: string; avatar: string }
  currentUserRole?: string | null
  inboxUnreadCount?: number
  activityUnreadCount?: number
}

export function AppSidebar({
  workspaces = [],
  activeWorkspaceId = "",
  user,
  currentUserRole = null,
  inboxUnreadCount = 0,
  activityUnreadCount = 0,
  ...props
}: AppSidebarProps) {
  const resolvedUser = user ?? {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  }

  const [projects, setProjects] = React.useState<
    { id: string; name: string }[]
  >([])

  const [apacWorkstreams, setApacWorkstreams] = React.useState<
    { id: string; title: string }[]
  >([])

  React.useEffect(() => {
    if (!activeWorkspaceId) return
    supabase
      .from("projects")
      .select("id, name")
      .eq("workspace_id", activeWorkspaceId)
      .eq("status", "Active")
      .order("created_at", { ascending: true })
      .then(({ data }) =>
        setProjects((data ?? []) as { id: string; name: string }[])
      )
  }, [activeWorkspaceId])

  React.useEffect(() => {
    const apacProject = projects.find((p) => /apac/i.test(p.name))
    if (!apacProject) {
      setApacWorkstreams([])
      return
    }
    supabase
      .from("tasks")
      .select("id, title")
      .eq("project_id", apacProject.id)
      .in("title", [
        "Production Remediation Rollout",
        "Development Remediation Rollout",
      ])
      .then(({ data }) =>
        setApacWorkstreams((data ?? []) as { id: string; title: string }[])
      )
  }, [projects])

  const isViewer = currentUserRole === "viewer"
  const isAdmin = currentUserRole === "admin"
  const apacProject = projects.find((p) => /apac/i.test(p.name))

  const items = isViewer
    ? [
        {
          title: apacProject?.name ?? "Sprint Dashboard",
          url: "/sprint-dashboard",
          icon: LayoutDashboard,
          isActive: true,
          items: [] as { title: string; url: string }[],
        },
      ]
    : navMain
        .filter((item) => item.title !== "Settings" || isAdmin)
        .map((item) => {
          if (item.title === "Activity")
            return { ...item, badge: activityUnreadCount }

          if (item.title === "Projects") {
            // Use bare paths — nav-main.withWs() appends ?ws= from current URL
            const projectItems: { title: string; url: string }[] =
              projects.length
                ? projects.map((p) => ({
                    title: p.name,
                    url: /apac/i.test(p.name)
                      ? "/sprint-dashboard"
                      : "/projects",
                  }))
                : [{ title: "All Projects", url: "/projects" }]
            return { ...item, items: projectItems }
          }

          if (item.title === "Tasks") {
            const hasApac = projects.some((p) => /apac/i.test(p.name))
            const prodId = apacWorkstreams.find(
              (w) => w.title === "Production Remediation Rollout"
            )?.id
            const devId = apacWorkstreams.find(
              (w) => w.title === "Development Remediation Rollout"
            )?.id
            const taskItems = hasApac
              ? [
                  { title: "All Tasks", url: "/tasks" },
                  {
                    title: "Production Remediation Rollout",
                    url: prodId ? `/tasks?parent=${prodId}` : "/tasks",
                  },
                  {
                    title: "Development Remediation Rollout",
                    url: devId ? `/tasks?parent=${devId}` : "/tasks",
                  },
                ]
              : [{ title: "All Tasks", url: "/tasks" }]
            return { ...item, items: taskItems }
          }

          return item
        })

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {workspaces.length > 0 ? (
          <WorkspaceSwitcher
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
          />
        ) : (
          <div className="flex h-14 items-center px-4">
            <span className="text-sm font-medium text-sidebar-foreground/50">
              Loading…
            </span>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {!isViewer && (
          <SidebarMenu className="px-2 py-1">
            <NavInbox
              unreadCount={inboxUnreadCount}
              activeWorkspaceId={activeWorkspaceId}
            />
          </SidebarMenu>
        )}
        <NavMain items={items} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={resolvedUser} />
      </SidebarFooter>
    </Sidebar>
  )
}
