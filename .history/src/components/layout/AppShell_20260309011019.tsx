import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  Bell,
  Calendar,
  CheckCircle2,
  Clock3,
  ChevronDown,
  ChevronRight,
  FileText,
  Flag,
  Inbox,
  LayoutGrid,
  ListTodo,
  Mail,
  MessageSquare,
  Moon,
  PanelLeftClose,
  Paperclip,
  PlusCircle,
  ReceiptText,
  Search,
  Settings,
  Sun,
  Timer,
  Trash2,
  UserPlus,
  X,
  Users,
  UsersRound,
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
import {
  formatNotification,
  getNotificationDefinition,
} from "@/lib/notifications/notificationCatalog";
import { normalizeNotificationPayloadV2 } from "@/lib/notifications/notificationTypes";
import { timeAgo } from "@/lib/notifications/timeAgo";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { useToast } from "@/providers/ToastProvider";
import type { Notification } from "@/types/models";

type AppShellProps = {
  children: ReactNode;
};

const navItems = [
  {
    key: "project-overview",
    label: "Project Overview",
    to: "project-overview",
    Icon: LayoutGrid,
  },
  { key: "tasks", label: "Tasks", to: "tasks", Icon: ListTodo },
  { key: "users", label: "Users", to: "users", Icon: UsersRound },
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
      className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-xl bg-card/20 text-sidebar-muted transition-colors hover:bg-card/35 hover:text-sidebar-foreground"
    >
      {children}
    </button>
  );
}

// ─── Inbox helpers ────────────────────────────────────────────────────────────

const NOTIF_ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  Bell,
  Calendar,
  CheckCircle2,
  Clock3,
  FileText,
  Flag,
  Mail,
  MessageSquare,
  Paperclip,
  PlusCircle,
  Trash2,
  UserPlus,
};

function getNotifIcon(name: string): ComponentType<{ className?: string }> {
  return NOTIF_ICON_MAP[name] ?? Bell;
}

function getInboxInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((token) => token.charAt(0).toUpperCase())
    .join("");
}

function getNotificationTypeLabel(type: string): string {
  return getNotificationDefinition(type).label;
}

function InboxPropertyRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): ReactElement {
  return (
    <div className="px-4 py-3">
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-[#5F6272]">
        {label}
      </p>
      <div>{children}</div>
    </div>
  );
}

interface InboxListItemMsg {
  title: string;
  subtitle?: string;
  icon: string;
  entity: string;
  actor: string;
  actorAvatarUrl: string | null;
  route: string | null;
  status: string;
}

function InboxListItem({
  notification,
  isActive,
  msg,
  onSelect,
}: {
  notification: Notification;
  isActive: boolean;
  msg: InboxListItemMsg;
  onSelect: () => void;
}): ReactElement {
  const IconComponent = getNotifIcon(msg.icon);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative w-full border-b border-[#1D1E2C] px-3 py-2.5 text-left transition-colors last:border-b-0",
        isActive ? "bg-[#1F2133]" : "hover:bg-[#1C1D2A]",
      )}
    >
      {!notification.read_at ? (
        <span className="absolute left-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-primary" />
      ) : null}
      <div className="flex items-start gap-2.5 pl-2">
        <div
          className={cn(
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px]",
            isActive ? "bg-[#2A2B3D]" : "bg-[#1F2030]",
          )}
        >
          <IconComponent className="h-3.5 w-3.5 text-[#8B8C9E]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-1">
            <p
              className={cn(
                "truncate text-[13px] font-medium leading-[18px]",
                isActive || !notification.read_at
                  ? "text-white"
                  : "text-[#B8B9C6]",
              )}
            >
              {msg.title}
            </p>
            <span className="shrink-0 text-[11px] leading-[18px] text-[#5F6170]">
              {timeAgo(notification.created_at)}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[12px] leading-[17px] text-[#5F6272]">
            {msg.entity !== "General update"
              ? msg.entity
              : (msg.subtitle ?? "")}
          </p>
        </div>
      </div>
    </button>
  );
}

// ─── AppShell ─────────────────────────────────────────────────────────────────

export default function AppShell({
  children,
}: AppShellProps): React.ReactElement {
  const queryClient = useQueryClient();
  const { user, signOut } = useAuth();
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
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [snoozedIds, setSnoozedIds] = useState<string[]>([]);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const profileFullName =
    typeof user?.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "";
  const profileName: string =
    profileFullName.trim() || user?.email?.split("@")[0] || "Levon Gravett";
  const profileAvatarUrl = user?.user_metadata?.avatar_url as
    | string
    | undefined;
  const profileInitials = profileName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((token) => token.charAt(0).toUpperCase())
    .join("");

  const inboxItems = useMemo(
    () =>
      notifications.filter(
        (notification) => !snoozedIds.includes(notification.id),
      ),
    [notifications, snoozedIds],
  );

  const groupedInboxItems = useMemo(() => {
    const now = Date.now();
    const oneDayMs = 86_400_000;
    const today: Notification[] = [];
    const earlier: Notification[] = [];
    for (const item of inboxItems) {
      if (now - new Date(item.created_at).getTime() < oneDayMs) {
        today.push(item);
      } else {
        earlier.push(item);
      }
    }
    return { today, earlier };
  }, [inboxItems]);

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

  useEffect(() => {
    if (!profileMenuOpen) return;

    const handlePointerDown = (event: PointerEvent): void => {
      const target = event.target as Node;
      if (!profileMenuRef.current?.contains(target)) {
        setProfileMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [profileMenuOpen]);

  useEffect(() => {
    if (inboxOpen) {
      setInboxOpen(false);
    }
  }, [pathname]);

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

  const handleSignOut = async (): Promise<void> => {
    try {
      await signOut();
      navigate("/login");
      setProfileMenuOpen(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to log out.";
      showToast(message, "error");
    }
  };

  const renderInboxMessage = (notification: Notification) => {
    const payload = normalizeNotificationPayloadV2(
      notification.type,
      notification.payload ?? {},
      notification.workspace_id,
    );

    const actorName = payload.actor.name?.trim();
    const actorFromEmail = payload.actor.email
      ?.split("@")[0]
      ?.split(/[._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

    return {
      ...formatNotification(notification.type, payload),
      route: payload.target?.route ?? null,
      entity: payload.entity.name ?? "General update",
      actor: actorName || actorFromEmail || "Workspace update",
      actorAvatarUrl: payload.actor.avatar_url ?? null,
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
            onClick={() => {
              setInboxOpen(false);
              navigate("/workspaces");
            }}
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
            {workspaceNavItems
              .filter((item) => item.key === "project-overview")
              .map(({ key, label, to, Icon }) => {
                const active = pathname.includes(`/${to}`);
                return (
                  <NavLink
                    key={key}
                    to={`/w/${workspaceId}/${to}`}
                    title={label}
                    onClick={() => setInboxOpen(false)}
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

            {workspaceNavItems
              .filter((item) => item.key !== "project-overview")
              .map(({ key, label, to, Icon }) => {
              const active = pathname.includes(`/${to}`);

              return (
                <NavLink
                  key={key}
                  to={`/w/${workspaceId}/${to}`}
                  title={label}
                  onClick={() => setInboxOpen(false)}
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
                    onClick={() => setInboxOpen(false)}
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
      </aside>

      <div className="relative flex min-h-screen min-w-0 flex-col overflow-hidden bg-background text-foreground">
        <header className="header sticky top-0 z-10 h-14 border-b border-border/60 bg-card/70">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={toggleSidebar}
              className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md border border-sidebar-border/70 bg-card/20 text-sidebar-muted transition-colors hover:bg-card/35 hover:text-sidebar-foreground"
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
            <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
            <h1 className="text-[18px] font-medium leading-[22px] text-white">
              {selectedWorkspaceName}
            </h1>
          </div>

          <div className="header-actions relative" ref={profileMenuRef}>
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
              className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-card/20 px-3 text-sidebar-muted transition-colors hover:bg-card/35 hover:text-sidebar-foreground"
              onClick={() => setProfileMenuOpen((open) => !open)}
              aria-haspopup="true"
              aria-expanded={profileMenuOpen}
              aria-label="Profile menu"
            >
              {profileAvatarUrl ? (
                <img
                  src={profileAvatarUrl}
                  alt={profileName}
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/25 text-xs font-semibold text-sidebar-foreground">
                  {profileInitials || "LG"}
                </span>
              )}
              <span className="max-w-[180px] truncate text-xs font-medium leading-4 text-sidebar-foreground">
                {profileName}
              </span>
              <ChevronDown className="h-4 w-4" />
            </button>

            {profileMenuOpen ? (
              <div className="absolute right-0 top-12 z-50 w-[224px] rounded-[8px] border border-[#333541] bg-[#1B1C23] p-[0.5px] shadow-[0px_3px_8px_rgba(0,0,0,0.12),0px_2px_5px_rgba(0,0,0,0.12),0px_1px_1px_rgba(0,0,0,0.12)]">
                <div className="flex flex-col py-1">
                  <button
                    type="button"
                    className="focus-ring mx-1.5 inline-flex h-8 items-center justify-between rounded-[6px] px-[14px] text-[13px] leading-4 text-[#E4E4EC] transition-colors hover:bg-[#2B2C34]"
                    onClick={() => {
                      navigate(`/w/${workspaceId}/settings`);
                      setProfileMenuOpen(false);
                    }}
                  >
                    <span>Preferences</span>
                  </button>

                  <div className="my-1 border-b border-[#2E2F3B]" />

                  <button
                    type="button"
                    className="focus-ring mx-1.5 inline-flex h-8 items-center rounded-[6px] bg-[#2B2C34] px-[14px] text-[13px] leading-4 text-white"
                    onClick={() => {
                      navigate(`/w/${workspaceId}/settings`);
                      setProfileMenuOpen(false);
                    }}
                  >
                    Workspace settings
                  </button>

                  <button
                    type="button"
                    className="focus-ring mx-1.5 inline-flex h-8 items-center rounded-[6px] px-[14px] text-[13px] leading-4 text-[#E4E4EC] transition-colors hover:bg-[#2B2C34]"
                    onClick={() => {
                      navigate(`/w/${workspaceId}/clients`);
                      setProfileMenuOpen(false);
                    }}
                  >
                    Invite and manage members
                  </button>

                  <div className="my-1 border-b border-[#2E2F3B]" />

                  <button
                    type="button"
                    className="focus-ring mx-1.5 inline-flex h-8 items-center justify-between rounded-[6px] px-[14px] text-[13px] leading-4 text-[#E4E4EC] transition-colors hover:bg-[#2B2C34]"
                    onClick={() => {
                      navigate("/workspaces");
                      setProfileMenuOpen(false);
                    }}
                  >
                    <span>Switch workspace</span>
                    <ChevronRight className="h-3 w-3 text-[#5F6066]" />
                  </button>

                  <button
                    type="button"
                    className="focus-ring mx-1.5 inline-flex h-8 items-center justify-between rounded-[6px] px-[14px] text-[13px] leading-4 text-[#E4E4EC] transition-colors hover:bg-[#2B2C34]"
                    onClick={() => {
                      void handleSignOut();
                    }}
                  >
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </header>

        {inboxOpen ? (
          <section className="absolute inset-x-0 bottom-0 top-14 z-40 overflow-hidden bg-[#15161D]">
            <div className="grid h-full min-h-0 grid-cols-[280px_minmax(0,1fr)_260px]">
              {/* ── LEFT: Inbox list ── */}
              <div className="flex min-h-0 flex-col border-r border-[#222330] bg-[#1A1B24]">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#222330] px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Inbox className="h-[15px] w-[15px] text-[#6B6E7B]" />
                    <span className="text-[13px] font-semibold text-white">
                      Inbox
                    </span>
                    {unreadCount > 0 ? (
                      <span className="inline-flex min-w-[18px] items-center justify-center rounded-[3px] bg-[#2D2E3A] px-1 py-px text-[11px] font-medium leading-[16px] text-[#A8A9B5]">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="text-[11px] text-[#6B6E7B] transition-colors hover:text-[#B0B1BC]"
                      onClick={() => {
                        if (markAllReadMutation.isPending) return;
                        void markAllReadMutation.mutateAsync();
                      }}
                    >
                      Mark all read
                    </button>
                    <button
                      type="button"
                      onClick={() => setInboxOpen(false)}
                      className="focus-ring inline-flex h-6 w-6 items-center justify-center rounded-[4px] text-[#5F6170] transition-colors hover:bg-[#252630] hover:text-white"
                      aria-label="Close inbox"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Notification list */}
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {inboxItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
                      <Inbox className="mb-3 h-8 w-8 text-[#2E2F3E]" />
                      <p className="text-[13px] text-[#5F6170]">
                        All caught up
                      </p>
                    </div>
                  ) : (
                    <>
                      {groupedInboxItems.today.length > 0 ? (
                        <div>
                          <div className="sticky top-0 z-10 bg-[#1A1B24] px-3 pb-1 pt-3 text-[11px] font-medium text-[#5F6170]">
                            Today
                          </div>
                          {groupedInboxItems.today.map((notification) => (
                            <InboxListItem
                              key={notification.id}
                              notification={notification}
                              isActive={
                                activeNotification?.id === notification.id
                              }
                              msg={renderInboxMessage(notification)}
                              onSelect={() =>
                                handleSelectInboxItem(notification)
                              }
                            />
                          ))}
                        </div>
                      ) : null}
                      {groupedInboxItems.earlier.length > 0 ? (
                        <div>
                          <div className="sticky top-0 z-10 bg-[#1A1B24] px-3 pb-1 pt-3 text-[11px] font-medium text-[#5F6170]">
                            Earlier
                          </div>
                          {groupedInboxItems.earlier.map((notification) => (
                            <InboxListItem
                              key={notification.id}
                              notification={notification}
                              isActive={
                                activeNotification?.id === notification.id
                              }
                              msg={renderInboxMessage(notification)}
                              onSelect={() =>
                                handleSelectInboxItem(notification)
                              }
                            />
                          ))}
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              </div>

              {/* ── MIDDLE + RIGHT ── */}
              <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] md:col-span-2 md:grid-cols-[minmax(0,1fr)_260px]">
                {/* Shared header bar */}
                <header className="flex items-center justify-between gap-3 border-b border-[#222330] bg-[#191A22] px-5 py-[11px] md:col-span-2">
                  <div className="min-w-0 flex-1">
                    {activeNotification ? (
                      <p className="mb-0.5 flex items-center gap-1 truncate text-[11px] text-[#5F6272]">
                        <span>{selectedWorkspaceName}</span>
                        <ChevronRight className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {renderInboxMessage(activeNotification).entity}
                        </span>
                      </p>
                    ) : null}
                    <h3 className="truncate text-[14px] font-semibold leading-[20px] text-white">
                      {activeNotification
                        ? renderInboxMessage(activeNotification).title
                        : "Select a notification"}
                    </h3>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="rounded-sm"
                      onClick={handleDeleteActive}
                      disabled={!activeNotification || deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="rounded-sm"
                      onClick={handleSnoozeActive}
                      disabled={!activeNotification}
                    >
                      <Clock3 className="h-4 w-4" />
                      Snooze
                    </Button>
                    {activeNotification &&
                    renderInboxMessage(activeNotification).route ? (
                      <Button
                        variant="primary"
                        size="sm"
                        className="rounded-sm"
                        onClick={() => {
                          const route =
                            renderInboxMessage(activeNotification).route;
                          if (!route) return;
                          setInboxOpen(false);
                          void navigate(route);
                        }}
                      >
                        Open Task
                      </Button>
                    ) : null}
                  </div>
                </header>

                {/* Middle: task-drawer-style content pane */}
                <div className="flex min-h-0 flex-col overflow-y-auto border-r border-[#222330]">
                  {activeNotification ? (
                    (() => {
                      const message = renderInboxMessage(activeNotification);
                      const isComment =
                        activeNotification.type === "comment.created";
                      const typeLabel = getNotificationTypeLabel(
                        activeNotification.type,
                      );

                      // Parse "entity -- change" from subtitle when present
                      const changeMatch =
                        message.subtitle?.match(/^(.+?)\s*--\s*(.+)$/);
                      const entityPart = changeMatch
                        ? changeMatch[1].trim()
                        : null;
                      const changePart = changeMatch
                        ? changeMatch[2].trim()
                        : null;

                      return (
                        <div className="flex-1 space-y-6 px-6 py-6">
                          {/* Title block */}
                          <div>
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#5F6272]">
                              {typeLabel}
                            </p>
                            <h2 className="text-[22px] font-medium leading-[28px] tracking-[-0.3px] text-white">
                              {message.title}
                            </h2>
                            <div className="mt-2 flex items-center gap-2 text-[12px] text-[#6B6D7A]">
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#2A2C3A] text-[9px] font-bold text-[#A0A2B0]">
                                {getInboxInitials(message.actor)}
                              </span>
                              <span>{message.actor}</span>
                              <span>·</span>
                              <span>
                                {timeAgo(activeNotification.created_at)}
                              </span>
                            </div>
                          </div>

                          <div className="border-t border-[#222330]" />

                          {/* Content block */}
                          {isComment && message.subtitle ? (
                            /* Comment card */
                            <div className="flex gap-3">
                              {message.actorAvatarUrl ? (
                                <img
                                  src={message.actorAvatarUrl}
                                  alt={message.actor}
                                  className="mt-0.5 h-7 w-7 shrink-0 rounded-full object-cover"
                                />
                              ) : (
                                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#252636] text-[10px] font-bold text-[#8B8C9E]">
                                  {getInboxInitials(message.actor)}
                                </span>
                              )}
                              <div className="flex-1 rounded-[6px] border border-[#292B38] bg-[#1E1F2D] px-4 py-3">
                                <p className="mb-1.5 text-[12px] font-medium text-[#A0A2B0]">
                                  {message.actor}
                                </p>
                                <p className="text-[14px] leading-[22px] text-[#D4D5DE]">
                                  {message.subtitle}
                                </p>
                              </div>
                            </div>
                          ) : (
                            /* Fields block — TaskDrawer-style rows */
                            <div className="overflow-hidden rounded-[4px] border border-[#292B38] bg-[#191A22]">
                              {message.entity &&
                              message.entity !== "General update" ? (
                                <div className="grid grid-cols-[120px_1fr] border-b border-[#292B38]">
                                  <div className="px-3 py-2.5 text-[13px] font-medium text-[#6B6D7A]">
                                    {activeNotification.type.startsWith(
                                      "comment.",
                                    )
                                      ? "Comment on"
                                      : "Task"}
                                  </div>
                                  <div className="px-3 py-2.5 text-[13px] font-medium text-white">
                                    {entityPart ?? message.entity}
                                  </div>
                                </div>
                              ) : null}
                              {changePart ? (
                                <div className="grid grid-cols-[120px_1fr] border-b border-[#292B38]">
                                  <div className="px-3 py-2.5 text-[13px] font-medium text-[#6B6D7A]">
                                    Change
                                  </div>
                                  <div className="px-3 py-2.5 text-[13px] font-medium text-white">
                                    {changePart}
                                  </div>
                                </div>
                              ) : message.subtitle ? (
                                <div className="grid grid-cols-[120px_1fr] border-b border-[#292B38]">
                                  <div className="px-3 py-2.5 text-[13px] font-medium text-[#6B6D7A]">
                                    Detail
                                  </div>
                                  <div className="px-3 py-2.5 text-[13px] text-[#D4D5DE]">
                                    {message.subtitle}
                                  </div>
                                </div>
                              ) : null}
                              <div className="grid grid-cols-[120px_1fr]">
                                <div className="px-3 py-2.5 text-[13px] font-medium text-[#6B6D7A]">
                                  From
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-2.5">
                                  {message.actorAvatarUrl ? (
                                    <img
                                      src={message.actorAvatarUrl}
                                      alt={message.actor}
                                      className="h-4 w-4 rounded-full object-cover"
                                    />
                                  ) : (
                                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#252636] text-[8px] font-bold text-[#8B8C9E]">
                                      {getInboxInitials(message.actor)}
                                    </span>
                                  )}
                                  <span className="text-[13px] font-medium text-white">
                                    {message.actor}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="flex flex-1 flex-col items-center justify-center text-center">
                      <MessageSquare className="mb-3 h-8 w-8 text-[#2E3040]" />
                      <p className="text-[13px] text-[#5F6170]">
                        Select an item to view details
                      </p>
                    </div>
                  )}
                </div>

                {/* Right: properties rail */}
                <div className="hidden min-h-0 bg-[#191A22] md:flex md:flex-col">
                  <div className="border-b border-[#222330] px-4 py-2.5">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#5F6272]">
                      Properties
                    </h3>
                  </div>
                  {activeNotification ? (
                    (() => {
                      const message = renderInboxMessage(activeNotification);
                      return (
                        <div className="min-h-0 flex-1 divide-y divide-[#1F2030] overflow-y-auto">
                          <InboxPropertyRow label="Status">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-[4px] px-2 py-0.5 text-[12px] font-medium",
                                message.status === "Unread"
                                  ? "bg-primary/15 text-primary"
                                  : "bg-[#252530] text-[#8B8C9E]",
                              )}
                            >
                              {message.status}
                            </span>
                          </InboxPropertyRow>
                          <InboxPropertyRow label="Type">
                            <span className="text-[13px] text-[#C4C5D0]">
                              {getNotificationTypeLabel(
                                activeNotification.type,
                              )}
                            </span>
                          </InboxPropertyRow>
                          <InboxPropertyRow label="From">
                            <div className="flex items-center gap-1.5">
                              {message.actorAvatarUrl ? (
                                <img
                                  src={message.actorAvatarUrl}
                                  alt={message.actor}
                                  className="h-5 w-5 rounded-full object-cover"
                                />
                              ) : (
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#252636] text-[9px] font-bold text-[#8B8C9E]">
                                  {getInboxInitials(message.actor)}
                                </span>
                              )}
                              <span className="text-[13px] text-[#C4C5D0]">
                                {message.actor}
                              </span>
                            </div>
                          </InboxPropertyRow>
                          <InboxPropertyRow label="Received">
                            <span className="text-[13px] text-[#C4C5D0]">
                              {timeAgo(activeNotification.created_at)}
                            </span>
                          </InboxPropertyRow>
                          {message.entity &&
                          message.entity !== "General update" ? (
                            <InboxPropertyRow label="Related">
                              <span className="text-[13px] text-[#C4C5D0]">
                                {message.entity}
                              </span>
                            </InboxPropertyRow>
                          ) : null}
                        </div>
                      );
                    })()
                  ) : (
                    <p className="px-4 py-4 text-[13px] text-[#5F6170]">
                      No item selected.
                    </p>
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
