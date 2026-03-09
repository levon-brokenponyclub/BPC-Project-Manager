import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  LayoutGrid,
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSystemStatus } from "@/hooks/useSystemStatus";
import { getMyWorkspaceRole } from "@/api/workspaces";

import {
  getUnreadNotificationCount,
  listNotifications,
  markNotificationRead,
} from "@/api";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Input } from "@/components/ui/input";
import { queryKeys } from "@/lib/queryKeys";
import {
  getEffectiveRole,
  getStoredRoleView,
  setStoredRoleView,
  type RoleViewMode,
} from "@/lib/roleView";
import { isDemoMode } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { ProfileEditModal } from "@/components/profile/ProfileEditModal";

const navItems = [
  { key: "dashboard", label: "Dashboard", icon: LayoutGrid, path: "dashboard" },
  { key: "tasks", label: "Tasks", icon: ListTodo, path: "tasks" },
  { key: "time", label: "Time", icon: Timer, path: "time" },
  { key: "reports", label: "Reports", icon: ReceiptText, path: "reports" },
  { key: "settings", label: "Settings", icon: Settings, path: "settings" },
] as const;

export function AppShell(): React.ReactElement {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { signOut, user } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [roleViewMode, setRoleViewMode] = useState<RoleViewMode>("admin");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const safeWorkspaceId = workspaceId ?? "";

  const notificationsQuery = useQuery({
    queryKey: queryKeys.notifications(safeWorkspaceId),
    queryFn: () => listNotifications(safeWorkspaceId),
    enabled: Boolean(safeWorkspaceId),
  });

  const unreadCountQuery = useQuery({
    queryKey: queryKeys.unreadNotifications(safeWorkspaceId),
    queryFn: () => getUnreadNotificationCount(safeWorkspaceId),
    enabled: Boolean(safeWorkspaceId),
  });

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
  const effectiveRole = getEffectiveRole(actualRole, roleViewMode);
  const displayName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const greetingName =
    user?.user_metadata?.first_name || displayName.split(" ")[0] || "User";

  useEffect(() => {
    if (!safeWorkspaceId) {
      return;
    }
    setRoleViewMode(getStoredRoleView(safeWorkspaceId) ?? "admin");
  }, [safeWorkspaceId]);

  const handleRoleViewChange = (nextRoleView: RoleViewMode): void => {
    setRoleViewMode(nextRoleView);
    if (safeWorkspaceId) {
      setStoredRoleView(safeWorkspaceId, nextRoleView);
    }
  };

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

  const handleSignOut = async (): Promise<void> => {
    try {
      await signOut();
      window.location.href = "/login";
    } catch (err) {
      console.error("Logout error:", err);
      window.location.href = "/login";
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-4 md:grid-cols-[240px_1fr]">
        <aside className="surface px-4 py-5 md:min-h-[86vh]">
          <button
            onClick={() => navigate("/workspaces")}
            className="mb-7 flex items-center gap-3 text-left"
          >
            <img
              src="/BPC-Logo.jpg"
              alt="BPC"
              className="h-10 w-10 rounded-xl"
            />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Broken Pony Club
              </p>
              <p className="text-xs text-muted">Client Portal</p>
            </div>
          </button>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const active = pathname.includes(`/${item.path}`);
              return (
                <NavLink
                  key={item.key}
                  to={`/w/${safeWorkspaceId}/${item.path}`}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                    active
                      ? "bg-primary text-white"
                      : "text-foreground hover:bg-stone-100"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
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
                  className={`inline-block h-2 w-2 rounded-full mr-2 ${systemStatus.connected ? "bg-green-500" : systemStatus.lastError ? "bg-red-500" : "bg-yellow-400"}`}
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
                  <span className="ml-2 text-red-600">
                    {systemStatus.lastError}
                  </span>
                )}
              </div>
            )}

          {actualRole === "admin" ? (
            <div className="mt-3 flex items-center rounded-xl border border-border bg-card p-1">
              <button
                className={`rounded-lg px-2 py-1 text-xs font-medium transition ${
                  roleViewMode === "admin"
                    ? "bg-primary text-white"
                    : "text-muted hover:bg-stone-100"
                }`}
                onClick={() => handleRoleViewChange("admin")}
                type="button"
              >
                Admin view
              </button>
              <button
                className={`rounded-lg px-2 py-1 text-xs font-medium transition ${
                  roleViewMode === "client"
                    ? "bg-primary text-white"
                    : "text-muted hover:bg-stone-100"
                }`}
                onClick={() => handleRoleViewChange("client")}
                type="button"
              >
                Client view
              </button>
            </div>
          ) : null}
        </aside>

        <div className="space-y-4">
          <header className="surface flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            {isDemoMode ? (
              <div className="flex w-full items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
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
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
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
                  onMarkRead={(id) => markReadMutation.mutate(id)}
                />
                <div className="relative" ref={profileMenuRef}>
                  <button
                    className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-stone-100 transition"
                    onClick={() => setProfileMenuOpen((current) => !current)}
                    type="button"
                  >
                    <img
                      src={
                        user?.user_metadata?.avatar_url || "/defaultAvatar.png"
                      }
                      alt="Avatar"
                      className="h-8 w-8 rounded-full border border-border object-cover"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {user?.user_metadata?.full_name ||
                          user?.email ||
                          "User"}
                      </span>
                      {profileMenuOpen ? (
                        <ChevronUp className="h-4 w-4 text-muted" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted" />
                      )}
                    </div>
                  </button>

                  {profileMenuOpen ? (
                    <div className="surface absolute right-0 z-30 mt-2 w-56 overflow-hidden py-1">
                      <button
                        className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-stone-50"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          setShowProfileModal(true);
                        }}
                        type="button"
                      >
                        User Profile
                      </button>
                      <button
                        className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-stone-50"
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
