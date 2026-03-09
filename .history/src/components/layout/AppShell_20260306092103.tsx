import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  Bell,
  BellOff,
  Clock3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Inbox,
  LayoutGrid,
  ListTodo,
  Moon,
  ReceiptText,
  Search,
  Settings,
  Sun,
  Timer,
  Trash2,
  X,
  Users,
} from "lucide-react";
import { NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteNotification,
  getMyWorkspaces,
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/api";
import { Button } from "@/components/ui/button";
import { formatNotification } from "@/lib/notifications/notificationCatalog";
import { normalizeNotificationPayloadV2 } from "@/lib/notifications/notificationTypes";
import { timeAgo } from "@/lib/notifications/timeAgo";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { useTheme } from "@/providers/ThemeProvider";
import { useToast } from "@/providers/ToastProvider";
import type { Notification } from "@/types/models";

type AppShellProps = {
  children: ReactNode;
};

const navItems = [
  { key: "dashboard", label: "Dashboard", to: "dashboard", Icon: LayoutGrid },
  {
    key: "project-overview",
    label: "Project Overview",
    to: "project-overview",
    Icon: LayoutGrid,
  },
  { key: "tasks", label: "Tasks", to: "tasks", Icon: ListTodo },
  { key: "clients", label: "Clients", to: "clients", Icon: Users },
  { key: "time", label: "Time", to: "time", Icon: Timer },
  { key: "reports", label: "Reports", to: "reports", Icon: ReceiptText },
  { key: "settings", label: "Settings", to: "settings", Icon: Settings },
] as const;

// Temporary hard‑coded navigation until DB exists
const demoCompanies = [
  {
    id: "cmp_acme",
    name: "Acme Ltd",
    projects: [
      { id: "prj_web", name: "Website Redesign" },
      { id: "prj_app", name: "Client Portal" },
    ],
  },
  {
    id: "cmp_next",
    name: "Next Systems",
    projects: [
      { id: "prj_api", name: "API Platform" },
      { id: "prj_mobile", name: "Mobile App" },
    ],
  },
];

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
      className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-[5px] border border-[#25262B] bg-[#191A22] text-[#959699] transition-colors hover:border-[#313339] hover:bg-[#1D1F24] hover:text-[#E2E3E5]"
    >
      {children}
    </button>
  );
}

export default function AppShell({
  children,
}: AppShellProps): React.ReactElement {
  const queryClient = useQueryClient();
  const { mode, setMode } = useTheme();
  const { showToast } = useToast();
  const { workspaceId = "" } = useParams<{ workspaceId: string }>();
  const { pathname } = useLocation();
  const isDashboardRoute = pathname.includes("/dashboard");
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("sidebarCollapsed") === "1";
  });

  const workspacesQuery = useQuery({
    queryKey: ["workspaces"],
    queryFn: getMyWorkspaces,
  });

  const notificationsQuery = useQuery({
    queryKey: queryKeys.notifications(workspaceId),
    queryFn: () => listNotifications(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const unreadCountQuery = useQuery({
    queryKey: queryKeys.unreadNotifications(workspaceId),
    queryFn: () => getUnreadNotificationCount(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const workspaces = workspacesQuery.data ?? [];
  const selectedWorkspace =
    workspaces.find((workspace) => workspace.id === workspaceId) ?? null;
  const selectedWorkspaceName = selectedWorkspace?.name ?? "Workspace";
  const notifications = notificationsQuery.data ?? [];
  const unreadCount = unreadCountQuery.data ?? 0;

  const [inboxOpen, setInboxOpen] = useState(false);
  const [activeNotificationId, setActiveNotificationId] = useState<
    string | null
  >(null);
  const [snoozedIds, setSnoozedIds] = useState<string[]>([]);
  const [unsubscribedTypes, setUnsubscribedTypes] = useState<string[]>([]);
  // sidebar demo expansion state
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);

  const profileName = "Levon Gravett";
  const profileEmail = "levon@bpc.co.za";

  const inboxItems = useMemo(
    () =>
      notifications.filter(
        (notification) =>
          !snoozedIds.includes(notification.id) &&
          !unsubscribedTypes.includes(notification.type),
      ),
    [notifications, snoozedIds, unsubscribedTypes],
  );

  const activeNotification =
    inboxItems.find(
      (notification) => notification.id === activeNotificationId,
    ) ??
    inboxItems[0] ??
    null;

  useEffect(() => {
    if (!inboxOpen || inboxItems.length === 0) {
      return;
    }
    if (
      activeNotificationId &&
      inboxItems.some(
        (notification) => notification.id === activeNotificationId,
      )
    ) {
      return;
    }
    setActiveNotificationId(inboxItems[0].id);
  }, [activeNotificationId, inboxItems, inboxOpen]);

  const readMutation = useMutation({
    mutationFn: (notificationId: string) =>
      markNotificationRead(notificationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.notifications(workspaceId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.unreadNotifications(workspaceId),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (notificationId: string) => deleteNotification(notificationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.notifications(workspaceId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.unreadNotifications(workspaceId),
      });
      showToast("Notification deleted.");
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Failed to delete notification.";
      showToast(message, "error");
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(workspaceId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.notifications(workspaceId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.unreadNotifications(workspaceId),
      });
      showToast("Inbox marked as read.");
    },
  });

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

  const isDarkThemeActive =
    mode === "dark" ||
    (mode === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const toggleTheme = (): void => {
    setMode(isDarkThemeActive ? "light" : "dark");
  };

  const handleSelectInboxItem = (notification: Notification): void => {
    setActiveNotificationId(notification.id);
    if (!notification.read_at && !readMutation.isPending) {
      void readMutation.mutateAsync(notification.id);
    }
  };

  const handleDeleteActive = (): void => {
    if (!activeNotification || deleteMutation.isPending) {
      return;
    }
    void deleteMutation.mutateAsync(activeNotification.id);
  };

  const handleSnoozeActive = (): void => {
    if (!activeNotification) {
      return;
    }
    setSnoozedIds((previous) => {
      if (previous.includes(activeNotification.id)) {
        return previous;
      }
      return [...previous, activeNotification.id];
    });
    showToast("Notification snoozed for this session.");
  };

  const handleUnsubscribeActive = (): void => {
    if (!activeNotification) {
      return;
    }
    setUnsubscribedTypes((previous) => {
      if (previous.includes(activeNotification.type)) {
        return previous;
      }
      return [...previous, activeNotification.type];
    });
    showToast("Unsubscribed from this notification type.");
  };

  const renderInboxMessage = (notification: Notification) => {
    const payload = normalizeNotificationPayloadV2(
      notification.type,
      notification.payload ?? {},
      notification.workspace_id,
    );
    return {
      ...formatNotification(notification.type, payload),
      route: payload.target?.route ?? null,
      entity: payload.entity.name ?? "General update",
      actor:
        payload.actor.name?.trim() ||
        payload.actor.email?.trim() ||
        "Workspace update",
      status: notification.read_at ? "Done" : "Unread",
    };
  };

  return (
    <div
      className="app-shell transition-[grid-template-columns] duration-200 ease-out"
      style={shellStyle}
    >
      <aside
        className={cn(
          "sidebar border-r border-[#25262B] bg-[#15161D] text-[#E2E3E5] transition-[width,padding] duration-200 ease-out",
          collapsed ? "px-3 py-5" : "px-3 py-4",
        )}
        style={{ width: collapsed ? "72px" : "275px" }}
      >
        <div className="sidebar-top">
          <button
            type="button"
            className={cn(
              "focus-ring flex items-center rounded-[4px] px-2 py-1.5 transition-colors hover:bg-[#1D1F24]",
              collapsed ? "justify-center" : "gap-2",
            )}
            onClick={() => navigate("/workspaces")}
            aria-label="Go to workspaces"
          >
            <img src="/BPC-Logo.jpg" alt="BPC" className="h-5 w-5 rounded-sm" />
            {!collapsed ? (
              <span className="text-[13px] font-semibold leading-4 text-white">
                Workspace
              </span>
            ) : null}
          </button>
        </div>

        {!collapsed ? (
          <div className="space-y-1 px-2 py-1">
            <div className="text-[11px] uppercase tracking-wide text-[#939496]">
              Workspace
            </div>
            <div className="text-[13px] font-medium text-white">
              {selectedWorkspaceName}
            </div>
          </div>
        ) : null}

        <nav className="mt-2 flex flex-1 flex-col gap-2">

          {/* Primary */}
          <NavLink
            to="#"
            className="focus-ring flex items-center rounded-[4px] px-2 py-1.5 text-[13px] text-[#E3E4EA] hover:bg-[#1D1F24]"
          >
            <Inbox className="mr-2 h-4 w-4" />
            Inbox
          </NavLink>

          <NavLink
            to="#"
            className="focus-ring flex items-center rounded-[4px] px-2 py-1.5 text-[13px] text-[#E3E4EA] hover:bg-[#1D1F24]"
          >
            <ListTodo className="mr-2 h-4 w-4" />
            Tasks
          </NavLink>

          <div className="my-2 border-t border-[#1A1B20]" />

          {/* Companies Section */}
          <div className="px-2 text-[11px] uppercase tracking-wide text-[#939496]">
            Workspace Companies
          </div>

          {demoCompanies.map((company) => {
            const expanded = expandedCompanyId === company.id;

            return (
              <div key={company.id} className="flex flex-col">

                <button
                  type="button"
                  onClick={() =>
                    setExpandedCompanyId((prev) =>
                      prev === company.id ? null : company.id,
                    )
                  }
                  className="focus-ring flex items-center justify-between rounded-[4px] px-2 py-1.5 text-[13px] text-[#E3E4EA] hover:bg-[#1D1F24]"
                >
                  <span className="truncate">{company.name}</span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 text-[#959699] transition-transform",
                      expanded && "rotate-180",
                    )}
                  />
                </button>

                {expanded ? (
                  <div className="ml-3 flex flex-col gap-1">

                    <NavLink
                      to="#"
                      className="rounded-[4px] px-2 py-1 text-[13px] text-[#E3E4EA] hover:bg-[#1D1F24]"
                    >
                      Tasks · Active
                    </NavLink>

                    <NavLink
                      to="#"
                      className="rounded-[4px] px-2 py-1 text-[13px] text-[#E3E4EA] hover:bg-[#1D1F24]"
                    >
                      Tasks · Backlog
                    </NavLink>

                    <div className="mt-1 px-2 text-[11px] uppercase tracking-wide text-[#939496]">
                      Projects
                    </div>

                    {company.projects.map((project) => (
                      <NavLink
                        key={project.id}
                        to="#"
                        className="rounded-[4px] px-2 py-1 text-[13px] text-[#E3E4EA] hover:bg-[#1D1F24]"
                      >
                        {project.name}
                      </NavLink>
                    ))}

                    <NavLink
                      to="#"
                      className="mt-1 rounded-[4px] px-2 py-1 text-[13px] text-[#E3E4EA] hover:bg-[#1D1F24]"
                    >
                      Views
                    </NavLink>
                  </div>
                ) : null}
              </div>
            );
          })}

          {/* Workspace Section */}
          <div className="mt-3 px-2 text-[11px] uppercase tracking-wide text-[#939496]">
            Workspace
          </div>

          <NavLink
            to={`/w/${workspaceId}/dashboard`}
            className="focus-ring flex items-center rounded-[4px] px-2 py-1.5 text-[13px] text-[#E3E4EA] hover:bg-[#1D1F24]"
          >
            <LayoutGrid className="mr-2 h-4 w-4" />
            Dashboard
          </NavLink>

          <NavLink
            to="#"
            className="focus-ring flex items-center rounded-[4px] px-2 py-1.5 text-[13px] text-[#E3E4EA] hover:bg-[#1D1F24]"
          >
            <Users className="mr-2 h-4 w-4" />
            Clients
          </NavLink>

          <NavLink
            to="#"
            className="focus-ring flex items-center rounded-[4px] px-2 py-1.5 text-[13px] text-[#E3E4EA] hover:bg-[#1D1F24]"
          >
            <Timer className="mr-2 h-4 w-4" />
            Time
          </NavLink>

          <NavLink
            to="#"
            className="focus-ring flex items-center rounded-[4px] px-2 py-1.5 text-[13px] text-[#E3E4EA] hover:bg-[#1D1F24]"
          >
            <ReceiptText className="mr-2 h-4 w-4" />
            Reports
          </NavLink>

        </nav>

        <div className="mt-auto space-y-2 pt-3">
          <div
            className={cn("flex", collapsed ? "justify-center" : "justify-end")}
          >
            <button
              type="button"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={toggleSidebar}
              className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-[5px] border border-[#25262B] bg-[#191A22] text-[#959699] transition-colors hover:border-[#313339] hover:bg-[#1D1F24] hover:text-[#E2E3E5]"
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>

          <button
            type="button"
            className={cn(
              "focus-ring flex w-full items-center rounded-[5px] border border-[#25262B] bg-[#15161D] transition-colors hover:bg-[#1D1F24]",
              collapsed ? "h-12 justify-center px-2" : "h-12 gap-2 px-2.5",
            )}
            aria-label="Profile"
          >
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2F3547] text-xs font-semibold text-white">
              LG
            </span>

            {!collapsed ? (
              <span className="flex min-w-0 flex-1 flex-col text-left">
                <span className="truncate text-[13px] font-medium leading-4 text-[#E2E3E5]">
                  {profileName}
                </span>
                <span className="truncate text-xs leading-4 text-[#939496]">
                  {profileEmail}
                </span>
              </span>
            ) : null}

            {!collapsed ? (
              <Settings className="h-4 w-4 text-[#959699]" />
            ) : null}
          </button>
        </div>
      </aside>

      <div className="relative flex min-h-screen min-w-0 flex-col overflow-hidden bg-[#15161D] text-[#E2E3E5]">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-[#1A1B20] bg-[#0F1011] px-6">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-[#8FB1C9]" />
            <h1 className="text-[18px] font-medium leading-[22px] text-white">
              {selectedWorkspaceName}
            </h1>
          </div>

          <div className="header-actions">
            <IconButton label="Search">
              <Search className="h-4 w-4" />
            </IconButton>
            <IconButton
              label={
                isDarkThemeActive
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
              onClick={toggleTheme}
            >
              {isDarkThemeActive ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </IconButton>
            <button
              type="button"
              className="focus-ring relative inline-flex h-10 items-center gap-2 rounded-[5px] border border-[#25262B] bg-[#191A22] px-3 text-[13px] font-medium text-[#E2E3E5] transition-colors hover:border-[#313339] hover:bg-[#1D1F24]"
              onClick={() => setInboxOpen((open) => !open)}
              aria-label="Toggle inbox"
            >
              <Inbox className="h-4 w-4" />
              <span className="text-sm">Inbox</span>
              {unreadCount > 0 ? (
                <span className="inline-flex min-w-4 items-center justify-center rounded-full bg-[#8FB1C9] px-1 text-[10px] leading-4 text-[#15161D]">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </button>
          </div>
        </header>

        {inboxOpen ? (
          <section className="absolute inset-x-0 bottom-0 top-14 z-40 overflow-hidden border-b border-[#25262B] bg-[#0F1011]">
            <div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-[300px_minmax(0,1fr)_280px]">
              <div className="flex min-h-0 flex-col border-b border-[#25262B] bg-[#15161D] md:border-b-0 md:border-r md:border-r-[#25262B]">
                <div className="flex items-center justify-between border-b border-[#1A1B20] px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-[#959699]" />
                    <h2 className="text-[18px] font-medium leading-[22px] text-white">
                      Inbox
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInboxOpen(false)}
                    className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-[5px] border border-[#25262B] bg-[#191A22] text-[#959699] transition-colors hover:border-[#313339] hover:bg-[#1D1F24] hover:text-[#E2E3E5]"
                    aria-label="Close inbox"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between px-3 py-2 text-[13px] text-[#939496]">
                  <span>{inboxItems.length} items</span>
                  <button
                    type="button"
                    className="focus-ring rounded-[4px] px-1.5 py-0.5 text-[#E2E3E5] transition-colors hover:bg-[#1D1F24]"
                    onClick={() => {
                      if (markAllReadMutation.isPending) return;
                      void markAllReadMutation.mutateAsync();
                    }}
                  >
                    Mark all read
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto pb-2">
                  {inboxItems.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-muted">
                      No notifications in inbox.
                    </div>
                  ) : (
                    inboxItems.map((notification) => {
                      const message = renderInboxMessage(notification);
                      const active = activeNotification?.id === notification.id;
                      return (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => handleSelectInboxItem(notification)}
                          className={cn(
                            "w-full border-b border-[#25262B] px-3 py-2.5 text-left transition-colors last:border-b-0",
                            active ? "bg-[#16171A]" : "hover:bg-[#1D1F24]",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-[18px] font-medium leading-[22px] text-white">
                              {message.title}
                            </p>
                            {!notification.read_at ? (
                              <span className="mt-1 h-2 w-2 rounded-full bg-[#8FB1C9]" />
                            ) : null}
                          </div>
                          {message.subtitle ? (
                            <p className="mt-1 line-clamp-2 text-[13px] leading-4 text-[#939496]">
                              {message.subtitle}
                            </p>
                          ) : null}
                          <p className="mt-1 text-[13px] leading-4 text-[#939496]">
                            {timeAgo(notification.created_at)}
                          </p>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex min-h-0 flex-col border-b border-[#25262B] md:border-b-0 md:border-r md:border-r-[#25262B] bg-[#0F1011]">
                <div className="flex items-center justify-between border-b border-[#1A1B20] px-4 py-2.5">
                  <h3 className="truncate text-[18px] font-medium leading-[22px] text-white">
                    {activeNotification
                      ? renderInboxMessage(activeNotification).title
                      : "Select a notification"}
                  </h3>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-[5px] border border-[#313339] bg-[#23262C] px-[14.5px] py-[8.25px] text-[13px] font-medium leading-4 text-[#E3E4E8] shadow-none transition-colors hover:bg-[#2A2D34]"
                      onClick={handleDeleteActive}
                      disabled={!activeNotification || deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-[#959699]" />
                      Delete notification
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-[5px] border border-[#313339] bg-[#23262C] px-[14.5px] py-[8.25px] text-[13px] font-medium leading-4 text-[#E3E4E8] shadow-none transition-colors hover:bg-[#2A2D34]"
                      onClick={handleSnoozeActive}
                      disabled={!activeNotification}
                    >
                      <Clock3 className="h-4 w-4 text-[#959699]" />
                      Snooze
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-[5px] border border-[#313339] bg-[#23262C] px-[14.5px] py-[8.25px] text-[13px] font-medium leading-4 text-[#E3E4E8] shadow-none transition-colors hover:bg-[#2A2D34]"
                      onClick={handleUnsubscribeActive}
                      disabled={!activeNotification}
                    >
                      <BellOff className="h-4 w-4 text-[#959699]" />
                      Unsubscribe
                    </Button>
                  </div>
                </div>

                {activeNotification ? (
                  (() => {
                    const message = renderInboxMessage(activeNotification);
                    return (
                      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 bg-[#0F1011]">
                        <p className="text-[12px] font-medium uppercase tracking-wide text-[#939496]">
                          {message.status}
                        </p>
                        <h4 className="text-2xl font-medium leading-8 tracking-[-0.16px] text-white">
                          {message.title}
                        </h4>
                        {message.subtitle ? (
                          <p className="text-[13px] leading-6 text-[#939496]">
                            {message.subtitle}
                          </p>
                        ) : null}
                        <div className="rounded-[5px] border border-[#25262B] bg-[#15161D] px-3 py-2 text-[13px] text-[#E2E3E5]">
                          <p>
                            <span className="text-[#939496]">Entity: </span>
                            {message.entity}
                          </p>
                          <p className="mt-1">
                            <span className="text-[#939496]">Updated: </span>
                            {timeAgo(activeNotification.created_at)}
                          </p>
                        </div>
                        {message.route ? (
                          <Button
                            variant="default"
                            size="default"
                            className="h-[23px] rounded-[5px] border border-[#6466D8] bg-[#575AC6] px-2 text-[12px] font-medium leading-[15px] text-[#FFFEFF] shadow-[0px_4px_4px_-1px_rgba(0,0,0,0.05),0px_1px_1px_rgba(0,0,0,0.1)] hover:bg-[#6366D8]"
                            onClick={() => {
                              if (!message.route) {
                                return;
                              }
                              setInboxOpen(false);
                              void navigate(message.route);
                            }}
                          >
                            Open Related Task
                          </Button>
                        ) : null}
                      </div>
                    );
                  })()
                ) : (
                  <div className="px-4 py-10 text-[13px] text-[#939496]">
                    Select an inbox item to view details.
                  </div>
                )}
              </div>

              <div className="hidden min-h-0 bg-[#0F1011] md:flex md:flex-col">
                <div className="border-b border-[#1A1B20] px-4 py-2.5">
                  <h3 className="text-[18px] font-medium leading-[22px] text-white">
                    Properties
                  </h3>
                </div>
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 text-[13px]">
                  {activeNotification ? (
                    (() => {
                      const message = renderInboxMessage(activeNotification);
                      return (
                        <>
                          <div>
                            <p className="text-[12px] uppercase tracking-wide text-[#939496]">
                              Status
                            </p>
                            <p className="mt-1 text-[13px] text-[#E2E3E5]">
                              {message.status}
                            </p>
                          </div>
                          <div>
                            <p className="text-[12px] uppercase tracking-wide text-[#939496]">
                              Type
                            </p>
                            <p className="mt-1 text-[13px] text-[#E2E3E5]">
                              {activeNotification.type}
                            </p>
                          </div>
                          <div>
                            <p className="text-[12px] uppercase tracking-wide text-[#939496]">
                              From
                            </p>
                            <p className="mt-1 text-[13px] text-[#E2E3E5]">
                              {message.actor}
                            </p>
                          </div>
                          <div>
                            <p className="text-[12px] uppercase tracking-wide text-[#939496]">
                              Received
                            </p>
                            <p className="mt-1 text-[13px] text-[#E2E3E5]">
                              {timeAgo(activeNotification.created_at)}
                            </p>
                          </div>
                        </>
                      );
                    })()
                  ) : (
                    <p className="text-[#939496]">No item selected.</p>
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <main className={cn("main overflow-auto bg-[#15161D]", isDashboardRoute && "p-0")}>
          {children}
        </main>
      </div>
    </div>
  );
}
