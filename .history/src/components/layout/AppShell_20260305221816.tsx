import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Users,
  ListTodo,
  Info,
  Search,
  ReceiptText,
  Settings,
  Timer,
} from "lucide-react";
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  useIsFetching,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useSystemStatus } from "@/hooks/useSystemStatus";
import { showBrowserNotification } from "@/hooks/useWebPushNotifications";
import { getMyWorkspaceRole } from "@/api/workspaces";
import type { WorkspaceUser } from "@/api/workspaces";
import { getWorkspaceUsers } from "@/api/workspaces";

import {
  clearAllNotifications,
  getMyWorkspaces,
  getUnreadNotificationCount,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/api";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Input } from "@/components/ui/input";
import { queryKeys } from "@/lib/queryKeys";
import { getEffectiveRole } from "@/lib/roleView";
import { isDemoMode } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { ProfileEditModal } from "@/components/profile/ProfileEditModal";

const navItems = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutGrid,
    path: "dashboard",
    adminOnly: false,
  },
  {
    key: "clients",
    label: "Clients",
    icon: Users,
    path: "clients",
    adminOnly: true,
  },
  {
    key: "tasks",
    label: "Tasks",
    icon: ListTodo,
    path: "tasks",
    adminOnly: false,
  },
  { key: "time", label: "Time", icon: Timer, path: "time", adminOnly: false },
  {
    key: "reports",
    label: "Reports",
    icon: ReceiptText,
    path: "reports",
    adminOnly: false,
  },
  {
    key: "settings",
    label: "Settings",
    icon: Settings,
    path: "settings",
    adminOnly: false,
  },
] as const;

export function AppShell(): React.ReactElement {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { signOut, user } = useAuth();
  const { showToast } = useToast();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("sidebarCollapsed") === "1";
  });
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const previousUnreadCountRef = useRef<number>(0);
  const isFetching = useIsFetching() > 0;

  const safeWorkspaceId = workspaceId ?? "";

  const notificationsQuery = useQuery({
    queryKey: queryKeys.notifications(safeWorkspaceId),
    queryFn: () => listNotifications(safeWorkspaceId),
    enabled: Boolean(safeWorkspaceId),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });

  const unreadCountQuery = useQuery({
    queryKey: queryKeys.unreadNotifications(safeWorkspaceId),
    queryFn: () => getUnreadNotificationCount(safeWorkspaceId),
    enabled: Boolean(safeWorkspaceId),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });

  const workspaceUsersQuery = useQuery({
    queryKey: ["workspace", safeWorkspaceId, "users"],
    queryFn: () => getWorkspaceUsers(safeWorkspaceId),
    enabled: Boolean(safeWorkspaceId),
  });

  const workspaceUsers: WorkspaceUser[] = workspaceUsersQuery.data ?? [];

  const workspacesQuery = useQuery({
    queryKey: queryKeys.workspaces,
    queryFn: getMyWorkspaces,
    enabled: Boolean(user?.id),
  });

  const availableWorkspaces = workspacesQuery.data ?? [];

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.notifications(safeWorkspaceId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.unreadNotifications(safeWorkspaceId),
        }),
      ]);
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(safeWorkspaceId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.notifications(safeWorkspaceId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.unreadNotifications(safeWorkspaceId),
        }),
      ]);
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: () => clearAllNotifications(safeWorkspaceId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.notifications(safeWorkspaceId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.unreadNotifications(safeWorkspaceId),
        }),
      ]);
    },
  });

  const systemStatus = useSystemStatus(workspaceId ?? "");
  const roleQuery = useQuery({
    queryKey: ["workspace", workspaceId, "myRole"],
    queryFn: () => getMyWorkspaceRole(workspaceId ?? ""),
    enabled: Boolean(workspaceId),
  });

  const actualRole =
    roleQuery.data === "admin" || roleQuery.data === "client"
      ? roleQuery.data
      : null;
  const effectiveRole = getEffectiveRole(actualRole, "admin");
  const displayName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const greetingName =
    user?.user_metadata?.first_name || displayName.split(" ")[0] || "User";

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!profileMenuRef.current?.contains(target)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      "sidebarCollapsed",
      sidebarCollapsed ? "1" : "0",
    );
  }, [sidebarCollapsed]);

  // Watch for new notifications and show toast + browser notification
  useEffect(() => {
    const currentUnreadCount = unreadCountQuery.data ?? 0;
    const previousUnreadCount = previousUnreadCountRef.current;

    // Only trigger on increase (new notification)
    if (currentUnreadCount > previousUnreadCount && previousUnreadCount > 0) {
      const newCount = currentUnreadCount - previousUnreadCount;

      // Show toast
      showToast("You have a new notification");

      // Show browser notification
      showBrowserNotification("New Notification", {
        body: `You have ${newCount} new notification${newCount > 1 ? "s" : ""}`,
        tag: "bpc-notification",
        requireInteraction: false,
      });
    }

    // Update the ref for next comparison
    previousUnreadCountRef.current = currentUnreadCount;
  }, [unreadCountQuery.data, showToast]);

  const handleSignOut = async (): Promise<void> => {
    try {
      await signOut();
      window.location.href = "/login";
    } catch (err) {
      console.error("Logout error:", err);
      window.location.href = "/login";
    }
  };

  const sidebarGridStyle = {
    "--sidebar-w": sidebarCollapsed ? "72px" : "240px",
  } as CSSProperties;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div
        className="mx-auto grid max-w-[1400px] grid-cols-1 gap-4 transition-[grid-template-columns] duration-200 ease-out md:gap-6 md:grid-cols-[var(--sidebar-w)_1fr]"
        style={sidebarGridStyle}
      >
        <aside className="surface flex flex-col rounded-2xl px-2 py-4 transition-[width] duration-200 ease-out md:min-h-[86vh] md:px-3">
          <div className="mb-4 flex items-center justify-between gap-2 px-1">
            <button
              onClick={() => navigate("/workspaces")}
              className={`flex items-center gap-3 rounded-xl p-1 text-left transition-colors hover:bg-surface/60 ${
                sidebarCollapsed ? "justify-center" : "min-w-0"
              }`}
              title="Workspaces"
            >
              <img
                src="/BPC-Logo.jpg"
                alt="BPC"
                className="h-10 w-10 rounded-xl"
              />
              {!sidebarCollapsed ? (
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    Broken Pony Club
                  </p>
                  <p className="text-xs text-muted">Client Portal</p>
                </div>
              ) : null}
            </button>

            <button
              type="button"
              onClick={() => setSidebarCollapsed((previous) => !previous)}
              aria-label={
                sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
              }
              className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors duration-200 ease-out hover:bg-surface/60 hover:text-foreground md:inline-flex"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>

          <nav className="flex-1 space-y-1.5">
            {navItems
              .filter((item) => item.key !== "settings")
              .map((item) => {
                if (item.adminOnly && effectiveRole !== "admin") {
                  return null;
                }

                const active = pathname.includes(`/${item.path}`);
                return (
                  <NavLink
                    key={item.key}
                    to={`/w/${safeWorkspaceId}/${item.path}`}
                    title={item.label}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-primary text-white shadow-sm"
                        : "text-foreground hover:bg-surface/60"
                    } ${sidebarCollapsed ? "justify-center px-2" : ""}`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!sidebarCollapsed ? item.label : null}
                  </NavLink>
                );
              })}

            {navItems
              .filter((item) => item.key === "settings")
              .map((item) => {
                if (item.adminOnly && effectiveRole !== "admin") {
                  return null;
                }

                const active = pathname.includes(`/${item.path}`);
                return (
                  <NavLink
                    key={item.key}
                    to={`/w/${safeWorkspaceId}/${item.path}`}
                    title={item.label}
                    className={`mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-primary text-white shadow-sm"
                        : "text-foreground hover:bg-surface/60"
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!sidebarCollapsed ? item.label : null}
                  </NavLink>
                );
              })}

            {availableWorkspaces.length > 1 && !sidebarCollapsed ? (
              <div className="mt-3 rounded-xl border border-border/70 p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Switch Workspace
                </p>
                <select
                  className="w-full rounded-xl border border-border bg-card px-2.5 py-2 text-sm text-foreground"
                  value={safeWorkspaceId}
                  onChange={(event) => {
                    const selectedWorkspaceId = event.target.value;
                    if (
                      !selectedWorkspaceId ||
                      selectedWorkspaceId === safeWorkspaceId
                    ) {
                      return;
                    }
                    navigate(`/w/${selectedWorkspaceId}/dashboard`);
                  }}
                >
                  {availableWorkspaces.map((workspace) => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </nav>

          {/* Admin-only system status indicator */}
          {systemStatus.mode === "live" &&
            systemStatus.supabaseConfigured &&
            effectiveRole === "admin" && (
              <div
                className="mt-6 rounded-xl border px-3 py-2 text-xs flex items-center gap-2"
                style={{
                  borderColor: systemStatus.connected
                    ? "#22c55e"
                    : systemStatus.lastError
                      ? "#ef4444"
                      : "#eab308",
                }}
              >
                <span
                  className={`inline-block h-2 w-2 rounded-full mr-2 ${systemStatus.connected ? "bg-green-500" : systemStatus.lastError ? "bg-red-500" : "bg-yellow-500"}`}
                  title={
                    systemStatus.connected
                      ? "Connected"
                      : systemStatus.lastError
                        ? "Error"
                        : "Not configured"
                  }
                />
                <span className="font-medium">
                  {systemStatus.connected
                    ? "Supabase: Connected"
                    : systemStatus.lastError
                      ? "Supabase: Error"
                      : "Supabase: Not configured"}
                </span>
                {systemStatus.lastError && (
                  <span className="ml-2 text-red-600 dark:text-red-400">
                    {systemStatus.lastError}
                  </span>
                )}
              </div>
            )}

          <div className="mt-4 border-t border-border/70 pt-3">
            <div className="relative" ref={profileMenuRef}>
              <button
                className={`flex w-full items-center rounded-xl px-2.5 py-2 transition-colors duration-200 ease-out hover:bg-surface/60 ${
                  sidebarCollapsed ? "justify-center" : "gap-2"
                }`}
                onClick={() => setProfileMenuOpen((current) => !current)}
                type="button"
                title="Account"
              >
                <img
                  src={user?.user_metadata?.avatar_url || "/defaultAvatar.png"}
                  alt="Avatar"
                  className="h-8 w-8 rounded-full border border-border object-cover"
                />
                {!sidebarCollapsed ? (
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-foreground">
                      {user?.user_metadata?.full_name || user?.email || "User"}
                    </span>
                    {profileMenuOpen ? (
                      <ChevronUp className="h-4 w-4 shrink-0 text-muted" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
                    )}
                  </div>
                ) : null}
              </button>

              {profileMenuOpen ? (
                <div
                  className={`surface absolute z-30 mt-2 w-56 overflow-hidden rounded-xl border border-border py-1 shadow-card ${
                    sidebarCollapsed ? "left-full ml-2 bottom-0" : "right-0"
                  }`}
                >
                  <button
                    className="w-full px-4 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface/60"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setShowProfileModal(true);
                    }}
                    type="button"
                  >
                    User Profile
                  </button>
                  <button
                    className="w-full px-4 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface/60"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      void handleSignOut();
                    }}
                    type="button"
                  >
                    Sign Out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </aside>

        <div className="space-y-4 md:space-y-6">
          <header className="surface rounded-2xl px-4 py-3">
            {isDemoMode ? (
              <div className="mb-3 flex w-full items-center justify-between rounded-xl border border-border bg-surface/70 px-3 py-2 text-xs text-foreground">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Info className="h-3.5 w-3.5" />
                  Demo mode — connect Supabase for live data
                </span>
                <a
                  className="underline"
                  href="/README.md#demo-mode"
                  target="_blank"
                  rel="noreferrer"
                >
                  Docs
                </a>
              </div>
            ) : null}

            <div className="w-full flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
                  Welcome, {greetingName} 👋
                </h2>
                <p className="text-sm text-muted">
                  Your personal dashboard overview
                </p>
              </div>

              <div className="ml-auto flex flex-wrap items-center gap-3">
                <div className="relative w-[260px] md:w-[360px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
                  <Input placeholder="Search..." className="pl-10" />
                </div>
                <NotificationBell
                  notifications={notificationsQuery.data ?? []}
                  unreadCount={unreadCountQuery.data ?? 0}
                  workspaceUsers={workspaceUsers}
                  onMarkRead={(id) => markReadMutation.mutate(id)}
                  onMarkAllRead={() => markAllReadMutation.mutate()}
                  onClearAll={() => clearAllMutation.mutate()}
                />
              </div>
            </div>

            <div
              className={`mt-3 h-1 overflow-hidden rounded-full bg-border/40 transition-opacity ${
                isFetching ? "opacity-100" : "opacity-0"
              }`}
              aria-hidden={!isFetching}
            >
              <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
            </div>
          </header>

          {showProfileModal && (
            <ProfileEditModal
              user={user}
              role={effectiveRole}
              workspaceId={workspaceId}
              onClose={() => setShowProfileModal(false)}
            />
          )}

          <main>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
