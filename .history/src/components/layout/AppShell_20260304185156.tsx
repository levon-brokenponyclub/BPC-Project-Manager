import { useEffect, useState } from "react";
import {
  LayoutGrid,
  ListTodo,
  Info,
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
  getRunningTimer,
} from "@/api";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { TimerWidget } from "@/components/time/TimerWidget";
import { Button } from "@/components/ui/button";
import { queryKeys } from "@/lib/queryKeys";
import { isDemoMode } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

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
  const { signOut } = useAuth();
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

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

  const runningTimerQuery = useQuery({
    queryKey: queryKeys.runningTimer(safeWorkspaceId),
    queryFn: () => getRunningTimer(safeWorkspaceId),
    enabled: Boolean(safeWorkspaceId),
    refetchInterval: 5000,
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

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-4 md:grid-cols-[240px_1fr]">
        <aside className="rounded-2xl border border-border bg-white px-4 py-5 shadow-soft md:min-h-[86vh]">
          <button
            onClick={() => navigate("/workspaces")}
            className="mb-7 flex items-center gap-3 text-left"
          >
            <img
              src="/bpc-logo.svg"
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
            roleQuery.data === "admin" && (
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
        </aside>

        <div className="space-y-4">
          <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white px-4 py-3 shadow-soft">
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
            <TimerWidget
              runningTimer={runningTimerQuery.data ?? null}
              nowTick={tick}
            />
            <div className="flex items-center gap-2">
              <NotificationBell
                notifications={notificationsQuery.data ?? []}
                unreadCount={unreadCountQuery.data ?? 0}
                onMarkRead={(id) => markReadMutation.mutate(id)}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  await signOut();
                  navigate("/login");
                }}
              >
                Logout
              </Button>
            </div>
          </header>

          <main>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
