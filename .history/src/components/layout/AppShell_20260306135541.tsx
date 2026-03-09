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
  ChevronRight,
  Inbox,
  LayoutGrid,
  ListTodo,
  Moon,
  PanelLeftClose,
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

const sidebarNavItemClassName =
  "focus-ring flex items-center rounded-[4px] px-[6px] py-[4px] text-[13px] font-medium leading-4 text-[#E2E3E5] transition-colors";

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
      className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-xl border border-sidebar-border/70 bg-card/20 text-sidebar-muted transition-colors hover:bg-card/35 hover:text-sidebar-foreground"
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

  const workspaceNavItems = navItems.filter(
    (item) => !["clients", "time", "reports", "settings"].includes(item.key),
  );

  const adminNavItems = navItems.filter((item) =>
    ["clients", "time", "reports", "settings"].includes(item.key),
  );

  const [inboxOpen, setInboxOpen] = useState(false);
  const [activeNotificationId, setActiveNotificationId] = useState<
    string | null
  >(null);
  const [snoozedIds, setSnoozedIds] = useState<string[]>([]);
  const [unsubscribedTypes, setUnsubscribedTypes] = useState<string[]>([]);

  const profileName = "Levon Gravett";

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
          "sidebar border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width,padding] duration-200 ease-out",
          collapsed ? "px-3 py-4" : "px-3 py-4",
        )}
        style={{ width: collapsed ? "72px" : "275px" }}
      >
        <div className="sidebar-top items-start">
          <button
            type="button"
            className={cn(
              "focus-ring flex min-w-0 items-center rounded-md transition-colors hover:bg-card/20",
              collapsed ? "h-10 w-10 justify-center px-0" : "gap-2 px-2 py-1.5",
            )}
            onClick={() => navigate("/workspaces")}
            aria-label="Go to workspaces"
          >
            <img src="/BPC-Logo.jpg" alt="BPC" className="h-5 w-5 rounded-sm" />
            {!collapsed ? (
              <span className="flex min-w-0 flex-col text-left">
                <span className="truncate text-[13px] font-semibold leading-4 text-sidebar-foreground">
                  Broken Pony Club
                </span>
                <span className="truncate text-xs font-medium leading-4 text-sidebar-muted">
                  Get Shit Done
                </span>
              </span>
            ) : null}
          </button>
        </div>

        <div className="mt-2 flex flex-1 flex-col overflow-hidden">
          <nav className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setInboxOpen(true)}
              title="Inbox"
              className={cn(
                sidebarNavItemClassName,
                inboxOpen ? "bg-[#1A1C1F]" : "hover:bg-[#1A1C1F]",
                collapsed ? "h-10 justify-center px-0" : "gap-[10px]",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-4 w-4 shrink-0 items-center justify-center",
                  collapsed
                    ? "h-10 w-10 rounded-full bg-[#151619]"
                    : "h-4 w-4 rounded-none bg-transparent",
                )}
              >
                <Inbox className="h-4 w-4 text-[#939496]" />
              </span>
              {!collapsed ? (
                <>
                  <span className="flex-1 truncate text-left">Inbox</span>
                  <span className="inline-flex min-w-[26px] items-center justify-center rounded-[4px] bg-[#151619] px-[6px] py-[3px] text-[11px] font-normal leading-[13px] text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                </>
              ) : null}
            </button>

            {workspaceNavItems.map(({ key, label, to, Icon }) => {
              const active = pathname.includes(`/${to}`);

              return (
                <NavLink
                  key={key}
                  to={`/w/${workspaceId}/${to}`}
                  title={label}
                  className={cn(
                    sidebarNavItemClassName,
                    active ? "bg-[#1A1C1F]" : "hover:bg-[#1A1C1F]",
                    collapsed ? "h-10 justify-center px-0" : "gap-[10px]",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-4 w-4 shrink-0 items-center justify-center",
                      collapsed
                        ? "h-10 w-10 rounded-full bg-[#151619]"
                        : "h-4 w-4 rounded-none bg-transparent",
                    )}
                  >
                    <Icon className="h-4 w-4 text-[#939496]" />
                  </span>
                  {!collapsed ? (
                    <span className="truncate">{label}</span>
                  ) : null}
                </NavLink>
              );
            })}
          </nav>

          {!collapsed ? (
            <div className="mt-5 space-y-2">
              <div className="px-2 pt-2 text-[12px] font-medium leading-[15px] text-[#939496]">
                Admin
              </div>
              {adminNavItems.map(({ key, label, to, Icon }) => {
                const active = pathname.includes(`/${to}`);

                return (
                  <NavLink
                    key={key}
                    to={`/w/${workspaceId}/${to}`}
                    title={label}
                    className={cn(
                      sidebarNavItemClassName,
                      active ? "bg-[#1A1C1F]" : "hover:bg-[#1A1C1F]",
                      "gap-[10px]",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-[#939496]" />
                    <span className="truncate">{label}</span>
                  </NavLink>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="mt-auto space-y-3 pt-3">
          {!collapsed ? (
            <div className="space-y-2">
            <div className="px-2 pt-2 text-[12px] font-medium leading-[15px] text-[#939496]">
              Workspace
            </div>

            {workspaces.length > 0 ? (
              <div className="space-y-1">
                <select
                  className="focus-ring w-full rounded-[4px] border border-sidebar-border bg-card/20 px-[10px] py-[7px] text-[13px] text-sidebar-foreground"
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
              </div>
            ) : null}
            </div>
          ) : null}

          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={toggleSidebar}
            className={cn(
              "focus-ring inline-flex items-center justify-center rounded-md border border-sidebar-border/70 bg-card/20 text-sidebar-muted transition-colors hover:bg-card/35 hover:text-sidebar-foreground",
              collapsed ? "h-10 w-10" : "h-8 w-8",
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>
      </aside>

      <div className="relative flex min-h-screen min-w-0 flex-col overflow-hidden bg-background text-foreground">
        <header className="header sticky top-0 z-10 h-14 border-b border-border/60 bg-card/70">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
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
              className="focus-ring inline-flex h-10 items-center gap-2 rounded-xl border border-sidebar-border/70 bg-card/20 px-3 text-sm font-medium text-sidebar-muted transition-colors hover:bg-card/35 hover:text-sidebar-foreground"
              onClick={() => setInboxOpen((open) => !open)}
              aria-label="Profile menu"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/25 text-xs font-semibold text-sidebar-foreground">
                LG
              </span>
              <span className="max-w-[180px] truncate text-sm font-medium text-sidebar-foreground">
                {profileName}
              </span>
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </header>

        {inboxOpen ? (
          <section className="absolute inset-x-0 bottom-0 top-14 z-40 overflow-hidden border-b border-border/70 bg-card">
            <div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-[300px_minmax(0,1fr)_280px]">
              <div className="flex min-h-0 flex-col border-b border-border/60 bg-surface/35 md:border-b-0 md:border-r">
                <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-muted" />
                    <h2 className="text-sm font-medium text-foreground">
                      Inbox
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInboxOpen(false)}
                    className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-card text-muted transition-colors hover:bg-surface/70 hover:text-foreground"
                    aria-label="Close inbox"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between px-3 py-2 text-xs text-muted">
                  <span>{inboxItems.length} items</span>
                  <button
                    type="button"
                    className="focus-ring rounded-md px-1.5 py-0.5 text-foreground transition-colors hover:bg-surface/80"
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
                            "w-full border-b border-border/50 px-3 py-2.5 text-left transition-colors last:border-b-0",
                            active ? "bg-surface/80" : "hover:bg-surface/60",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-sm font-medium text-foreground">
                              {message.title}
                            </p>
                            {!notification.read_at ? (
                              <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                            ) : null}
                          </div>
                          {message.subtitle ? (
                            <p className="mt-1 line-clamp-2 text-xs text-muted">
                              {message.subtitle}
                            </p>
                          ) : null}
                          <p className="mt-1 text-xs text-muted">
                            {timeAgo(notification.created_at)}
                          </p>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex min-h-0 flex-col border-b border-border/60 md:border-b-0 md:border-r">
                <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
                  <h3 className="truncate text-sm font-semibold text-foreground">
                    {activeNotification
                      ? renderInboxMessage(activeNotification).title
                      : "Select a notification"}
                  </h3>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-card/40 px-2.5 py-1 text-sm font-medium text-foreground shadow-[0px_4px_4px_-1px_rgba(0,0,0,0.05),0px_1px_1px_rgba(0,0,0,0.1)] transition-colors hover:bg-card/70"
                      onClick={handleDeleteActive}
                      disabled={!activeNotification || deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-muted" />
                      Delete notification
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-card/40 px-2.5 py-1 text-sm font-medium text-foreground shadow-[0px_4px_4px_-1px_rgba(0,0,0,0.05),0px_1px_1px_rgba(0,0,0,0.1)] transition-colors hover:bg-card/70"
                      onClick={handleSnoozeActive}
                      disabled={!activeNotification}
                    >
                      <Clock3 className="h-4 w-4 text-muted" />
                      Snooze
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-card/40 px-2.5 py-1 text-sm font-medium text-foreground shadow-[0px_4px_4px_-1px_rgba(0,0,0,0.05),0px_1px_1px_rgba(0,0,0,0.1)] transition-colors hover:bg-card/70"
                      onClick={handleUnsubscribeActive}
                      disabled={!activeNotification}
                    >
                      <BellOff className="h-4 w-4 text-muted" />
                      Unsubscribe
                    </Button>
                  </div>
                </div>

                {activeNotification ? (
                  (() => {
                    const message = renderInboxMessage(activeNotification);
                    return (
                      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted">
                          {message.status}
                        </p>
                        <h4 className="text-2xl font-semibold text-foreground">
                          {message.title}
                        </h4>
                        {message.subtitle ? (
                          <p className="text-sm leading-6 text-muted">
                            {message.subtitle}
                          </p>
                        ) : null}
                        <div className="rounded-md border border-border/60 bg-surface/40 px-3 py-2 text-sm text-foreground">
                          <p>
                            <span className="text-muted">Entity: </span>
                            {message.entity}
                          </p>
                          <p className="mt-1">
                            <span className="text-muted">Updated: </span>
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
                  <div className="px-4 py-10 text-sm text-muted">
                    Select an inbox item to view details.
                  </div>
                )}
              </div>

              <div className="hidden min-h-0 bg-card md:flex md:flex-col">
                <div className="border-b border-border/60 px-4 py-2.5">
                  <h3 className="text-sm font-medium text-foreground">
                    Properties
                  </h3>
                </div>
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm">
                  {activeNotification ? (
                    (() => {
                      const message = renderInboxMessage(activeNotification);
                      return (
                        <>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted">
                              Status
                            </p>
                            <p className="mt-1 text-foreground">
                              {message.status}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted">
                              Type
                            </p>
                            <p className="mt-1 text-foreground">
                              {activeNotification.type}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted">
                              From
                            </p>
                            <p className="mt-1 text-foreground">
                              {message.actor}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted">
                              Received
                            </p>
                            <p className="mt-1 text-foreground">
                              {timeAgo(activeNotification.created_at)}
                            </p>
                          </div>
                        </>
                      );
                    })()
                  ) : (
                    <p className="text-muted">No item selected.</p>
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <main className={cn("main overflow-auto", isDashboardRoute && "p-0")}>
          {children}
        </main>
      </div>
    </div>
  );
}
