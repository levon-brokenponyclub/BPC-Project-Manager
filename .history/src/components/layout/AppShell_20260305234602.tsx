import { useState, type CSSProperties, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  ListTodo,
  PanelLeft,
  ReceiptText,
  Search,
  Settings,
  Timer,
  Users,
} from "lucide-react";
import { NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { getMyWorkspaces } from "@/api";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: ReactNode;
};

const navItems = [
  { key: "dashboard", label: "Dashboard", to: "dashboard", Icon: LayoutGrid },
  { key: "tasks", label: "Tasks", to: "tasks", Icon: ListTodo },
  { key: "clients", label: "Clients", to: "clients", Icon: Users },
  { key: "time", label: "Time", to: "time", Icon: Timer },
  { key: "reports", label: "Reports", to: "reports", Icon: ReceiptText },
  { key: "settings", label: "Settings", to: "settings", Icon: Settings },
] as const;

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
}): React.ReactElement {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-md border border-sidebar-border/70 bg-card/20 text-sidebar-muted transition-colors hover:bg-card/35 hover:text-sidebar-foreground"
    >
      {children}
    </button>
  );
}

export default function AppShell({
  children,
}: AppShellProps): React.ReactElement {
  const { workspaceId = "" } = useParams<{ workspaceId: string }>();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("sidebarCollapsed") === "1";
  });

  const workspacesQuery = useQuery({
    queryKey: ["workspaces"],
    queryFn: getMyWorkspaces,
  });

  const workspaces = workspacesQuery.data ?? [];

  const toggleSidebar = (): void => {
    setCollapsed((previous) => {
      const next = !previous;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("sidebarCollapsed", next ? "1" : "0");
      }
      return next;
    });
  };

  const shellStyle = {
    gridTemplateColumns: `${collapsed ? "72px" : "275px"} minmax(0, 1fr)`,
  } as CSSProperties;

  return (
    <div
      className="app-shell transition-[grid-template-columns] duration-200 ease-out"
      style={shellStyle}
    >
      <aside
        className="sidebar border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width,padding] duration-200 ease-out"
        style={{ width: collapsed ? "72px" : "275px" }}
      >
        <div className="sidebar-top">
          <button
            type="button"
            className={cn(
              "focus-ring flex items-center rounded-md p-1 transition-colors hover:bg-card/20",
              collapsed ? "justify-center" : "gap-2",
            )}
            onClick={() => navigate("/workspaces")}
            aria-label="Go to workspaces"
          >
            <img src="/BPC-Logo.jpg" alt="BPC" className="h-5 w-5 rounded-sm" />
            {!collapsed ? (
              <span className="text-[13px] font-semibold leading-4 text-sidebar-foreground">
                Workspace
              </span>
            ) : null}
          </button>

          <div
            className={cn(
              "flex items-center",
              collapsed ? "flex-col gap-2" : "gap-1",
            )}
          >
            <IconButton label="Toggle panel" onClick={toggleSidebar}>
              <PanelLeft className="h-4 w-4" />
            </IconButton>
            <IconButton
              label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={toggleSidebar}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </IconButton>
          </div>
        </div>

        {!collapsed ? (
          <div className="space-y-2">
            <button
              type="button"
              className="focus-ring flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[13px] font-medium text-sidebar-foreground transition-colors hover:bg-card/20"
            >
              <span>Workspace</span>
              <ChevronDown className="h-3.5 w-3.5 text-sidebar-muted" />
            </button>

            {workspaces.length > 0 ? (
              <select
                className="focus-ring w-full rounded-md border border-sidebar-border bg-card/20 px-2 py-1.5 text-sm text-sidebar-foreground"
                value={workspaceId}
                onChange={(event) => {
                  const selectedWorkspaceId = event.target.value;
                  if (
                    !selectedWorkspaceId ||
                    selectedWorkspaceId === workspaceId
                  )
                    return;
                  navigate(`/w/${selectedWorkspaceId}/dashboard`);
                }}
              >
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        ) : null}

        <nav className="mt-1 flex flex-1 flex-col gap-1">
          {navItems.map(({ key, label, to, Icon }) => {
            const active = pathname.includes(`/${to}`);

            return (
              <NavLink
                key={key}
                to={`/w/${workspaceId}/${to}`}
                title={label}
                className={cn(
                  "focus-ring flex items-center rounded-md px-2 py-1.5 text-[13px] font-medium leading-4 transition-colors",
                  active
                    ? "border border-sidebar-border/60 bg-card/40 text-sidebar-foreground"
                    : "text-sidebar-foreground/90 hover:bg-card/30",
                  collapsed ? "justify-center" : "gap-2",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed ? <span>{label}</span> : null}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-col overflow-hidden bg-background text-foreground">
        <header className="header sticky top-0 z-10 h-10 border-b border-border/60 bg-card/60">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
            <h1 className="text-sm font-medium text-foreground">Personal</h1>
          </div>

          <div className="header-actions">
            <IconButton label="Search">
              <Search className="h-4 w-4" />
            </IconButton>
            <IconButton label="Notifications">
              <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
                <path
                  d="M8 2.5a3 3 0 0 0-3 3V7l-1 2.2h8L11 7V5.5a3 3 0 0 0-3-3z"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  fill="none"
                  strokeLinejoin="round"
                />
                <path
                  d="M6.5 12.3c.2.7.8 1.2 1.5 1.2s1.3-.5 1.5-1.2"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
            </IconButton>
          </div>
        </header>

        <main className="main overflow-auto">{children}</main>
      </div>
    </div>
  );
}
