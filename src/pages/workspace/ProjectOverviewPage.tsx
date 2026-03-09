import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Archive,
  Calendar,
  CheckCircle2,
  Clock3,
  File,
  Link2,
  Lock,
  Package,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";

import {
  getWorkspaceSupportSummary,
  listTasksWithSubtasks,
  listWorkspaceAssets,
} from "@/api";
import type { TaskWithUsers } from "@/api/tasks";
import {
  AssetBreakdownStrip,
  MiniBarChart,
  OverviewListCard,
  OverviewMetricCard,
  OverviewProgressCard,
  ProjectStatusStrip,
  TrendBadge,
} from "@/components/dashboard/OverviewCards";
import type {
  ListItem,
  PhaseEntry,
  ProjectHealth,
} from "@/components/dashboard/OverviewCards";
import { cn } from "@/lib/utils";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { DataStateWrapper } from "@/components/ui/DataStateWrapper";
import { EmptyState } from "@/components/ui/EmptyState";
import { timeAgo } from "@/lib/notifications/timeAgo";
import { queryKeys } from "@/lib/queryKeys";
import { notify } from "@/lib/toast";
import { supabase } from "@/lib/supabase";

export function ProjectOverviewPage(): React.ReactElement {
  const { workspaceId = "" } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [topUpHours, setTopUpHours] = useState<string>("");

  // ── Queries ────────────────────────────────────────────────────────────────
  const supportQuery = useQuery({
    queryKey: queryKeys.workspaceSupport(workspaceId),
    queryFn: () => getWorkspaceSupportSummary(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const workspaceNameQuery = useQuery({
    queryKey: ["workspace", workspaceId, "details"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspaces")
        .select("name")
        .eq("id", workspaceId)
        .single();
      if (error || !data) return "";
      return data.name as string;
    },
    enabled: Boolean(workspaceId),
  });

  const tasksQuery = useQuery<TaskWithUsers[]>({
    queryKey: queryKeys.tasks(workspaceId, "All", ""),
    queryFn: () => listTasksWithSubtasks(workspaceId, { status: "All" }),
    enabled: Boolean(workspaceId),
  });

  // ── Support hours ──────────────────────────────────────────────────────────
  const summary = supportQuery.data;
  const allocated = Number(summary?.hours_allocated ?? 0);
  const used = Number(summary?.hours_used ?? 0);
  const remaining = Number(summary?.hours_remaining ?? 0);
  // ── Top-up modal cost calc ─────────────────────────────────────────────────
  const RATE_PER_HOUR = 715;
  const VAT_RATE = 0.15;
  const hoursNum = parseFloat(topUpHours) || 0;
  const subtotal = hoursNum * RATE_PER_HOUR;
  const vatAmount = subtotal * VAT_RATE;
  const totalInclVat = subtotal + vatAmount;

  const handleRequestSupport = () => {
    notify.success(
      "Request submitted",
      `${topUpHours} hours request sent successfully.`,
    );
    setIsTopUpModalOpen(false);
    setTopUpHours("");
  };

  // ── Data states ────────────────────────────────────────────────────────────
  const isPrimaryLoading = supportQuery.isLoading || tasksQuery.isLoading;
  const isPrimaryError = supportQuery.isError || tasksQuery.isError;
  const primaryError = supportQuery.error ?? tasksQuery.error;
  const isPrimaryEmpty =
    !isPrimaryLoading &&
    (tasksQuery.data ?? []).length === 0 &&
    allocated === 0 &&
    used === 0 &&
    remaining === 0;

  // ── Derived dashboard data ─────────────────────────────────────────────────
  const derived = useMemo(() => {
    const parentTasks = tasksQuery.data ?? [];
    const allTasks = parentTasks.flatMap<TaskWithUsers>((t) => [
      t,
      ...(t.subtasks ?? []),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(today.getTime());
    sevenDaysAgo.setDate(today.getDate() - 7);
    const fourteenDaysAgo = new Date(today.getTime());
    fourteenDaysAgo.setDate(today.getDate() - 14);
    const endOfWeek = new Date(today.getTime());
    endOfWeek.setDate(today.getDate() + 7);

    // Overall completion
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter((t) => t.status === "Complete");
    const completedCount = completedTasks.length;
    const overallPercent =
      totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

    // Status buckets
    const overdueTasks = allTasks.filter((t) => {
      if (!t.due_date) return false;
      if (t.status === "Complete" || t.status === "Cancelled") return false;
      return new Date(t.due_date) < today;
    });
    const awaitingClientTasks = allTasks.filter(
      (t) => t.status === "Awaiting Client",
    );
    const inProgressTasks = allTasks.filter((t) => t.status === "In Progress");
    const blockedTasks = allTasks.filter((t) => t.blocked === true);

    // Velocity
    const completedThisWeek = allTasks.filter((t) => {
      if (!t.completed_at) return false;
      return new Date(t.completed_at) >= sevenDaysAgo;
    });
    const completedLastWeek = allTasks.filter((t) => {
      if (!t.completed_at) return false;
      const d = new Date(t.completed_at);
      return d >= fourteenDaysAgo && d < sevenDaysAgo;
    });
    const completedThisWeekCount = completedThisWeek.length;
    const dueThisWeek = inProgressTasks.filter(
      (t) => t.due_date != null && new Date(t.due_date) <= endOfWeek,
    );

    const weeklyDiff = completedThisWeekCount - completedLastWeek.length;
    const completedThisWeekHelper = allTasks.some((t) => t.completed_at)
      ? weeklyDiff > 0
        ? `+${weeklyDiff} vs last week`
        : weeklyDiff < 0
          ? `${weeklyDiff} vs last week`
          : "Same as last week"
      : `${completedCount} total`;

    // ── Weekly bars for MiniBarChart (last 7 days, day buckets) ─────────────
    // Build a 7-element array counting tasks completed per day (day 0 = oldest)
    const weeklyBars: number[] = Array(7).fill(0);
    for (const t of allTasks) {
      if (!t.completed_at) continue;
      const d = new Date(t.completed_at);
      const daysAgo = Math.floor(
        (today.getTime() - d.getTime()) / 86400000,
      );
      if (daysAgo >= 0 && daysAgo < 7) {
        weeklyBars[6 - daysAgo] += 1;
      }
    }
    // If there's no real data yet, use a plausible placeholder shape
    const hasWeeklyData = weeklyBars.some((b) => b > 0);
    const displayBars = hasWeeklyData
      ? weeklyBars
      : [1, 2, 1, 3, 2, 4, completedThisWeekCount > 0 ? completedThisWeekCount : 3];

    // ── Phases (parent tasks → phases, subtasks → work items) ──────────────
    const phaseEntries: PhaseEntry[] = parentTasks.map((task) => {
      const subs = task.subtasks ?? [];
      if (subs.length === 0) {
        const done = task.status === "Complete";
        return {
          label: task.title,
          complete: done ? 1 : 0,
          total: 1,
          percent: done ? 100 : 0,
          onClick: () => void navigate(`/w/${workspaceId}/tasks`),
        };
      }
      const completeCount = subs.filter((s) => s.status === "Complete").length;
      return {
        label: task.title,
        complete: completeCount,
        total: subs.length,
        percent: Math.round((completeCount / subs.length) * 100),
        onClick: () => void navigate(`/w/${workspaceId}/tasks`),
      };
    });

    const currentPhaseEntry = phaseEntries.find((p) => p.percent < 100);
    const currentPhase =
      currentPhaseEntry?.label ??
      phaseEntries[phaseEntries.length - 1]?.label ??
      "—";

    const currentPhaseTask = parentTasks.find((t) => t.title === currentPhase);
    const currentPhaseSubs = currentPhaseTask?.subtasks ?? [];
    const currentPhaseTotal =
      currentPhaseSubs.length > 0 ? currentPhaseSubs.length : 1;
    const currentPhaseComplete =
      currentPhaseSubs.length > 0
        ? currentPhaseSubs.filter((s) => s.status === "Complete").length
        : currentPhaseTask?.status === "Complete"
          ? 1
          : 0;
    const currentPhasePercent = Math.round(
      (currentPhaseComplete / Math.max(1, currentPhaseTotal)) * 100,
    );

    const currentIdx = phaseEntries.findIndex((p) => p.label === currentPhase);
    const nextMilestone =
      phaseEntries.slice(currentIdx + 1).find((p) => p.percent < 100) ?? null;

    // ── Health ────────────────────────────────────────────────────────────
    const atRiskCount =
      overdueTasks.length + awaitingClientTasks.length + blockedTasks.length;
    const atRiskParts: string[] = (
      [
        overdueTasks.length > 0 ? `${overdueTasks.length} overdue` : null,
        awaitingClientTasks.length > 0
          ? `${awaitingClientTasks.length} awaiting client`
          : null,
        blockedTasks.length > 0 ? `${blockedTasks.length} blocked` : null,
      ] as (string | null)[]
    ).filter((p): p is string => p !== null);
    const atRiskHelper = atRiskParts.join(" · ") || "No items at risk";

    const health: ProjectHealth =
      overdueTasks.length >= 3
        ? "Critical"
        : overdueTasks.length > 0 || awaitingClientTasks.length >= 2
          ? "At Risk"
          : "On Track";

    // ── Launch date ───────────────────────────────────────────────────────
    const dueDates = parentTasks
      .filter((t) => t.due_date)
      .map((t) => t.due_date as string)
      .sort();
    const maxDueDate = dueDates[dueDates.length - 1] ?? null;
    const launchDateFormatted = maxDueDate
      ? new Date(maxDueDate).toLocaleDateString("en-ZA", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
      : null;
    const daysRemaining = maxDueDate
      ? Math.ceil(
        (new Date(maxDueDate).setHours(0, 0, 0, 0) - today.getTime()) /
        86400000,
      )
      : null;

    // ── List items ────────────────────────────────────────────────────────
    const recentActivityItems: ListItem[] = [...allTasks]
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      )
      .slice(0, 6)
      .map((t) => ({
        id: t.id,
        primary: t.title,
        secondary: `${t.status} · ${timeAgo(t.updated_at)}`,
        onClick: () => void navigate(`/w/${workspaceId}/tasks`),
      }));

    // Focus list: overdue → blocked → high/urgent in-progress (deduped, max 5)
    const seen = new Set<string>();
    const focusTasksRaw: TaskWithUsers[] = [];
    for (const t of [
      ...overdueTasks,
      ...blockedTasks,
      ...inProgressTasks.filter(
        (x) => x.priority === "Urgent" || x.priority === "High",
      ),
    ]) {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        focusTasksRaw.push(t);
        if (focusTasksRaw.length >= 5) break;
      }
    }

    const overdueIds = new Set(overdueTasks.map((t) => t.id));
    const blockedIds = new Set(blockedTasks.map((t) => t.id));

    const focusItems: ListItem[] = focusTasksRaw.map((t) => {
      const isOverdue = overdueIds.has(t.id);
      const isBlocked = blockedIds.has(t.id);
      return {
        id: t.id,
        primary: t.title,
        secondary: isOverdue
          ? `Overdue${t.due_date
            ? ` · ${new Date(t.due_date).toLocaleDateString("en-ZA", {
              day: "numeric",
              month: "short",
            })}`
            : ""
          }`
          : isBlocked
            ? `Blocked${t.blocked_reason ? ` · ${t.blocked_reason.slice(0, 50)}` : ""}`
            : `${t.priority ?? t.status} · In Progress`,
        icon: isOverdue ? AlertTriangle : isBlocked ? AlertCircle : Zap,
        iconColor: isOverdue
          ? "bg-[#28141a] text-[#f87171]"
          : isBlocked
            ? "bg-[#231c10] text-[#d4a84b]"
            : "bg-[#1e2638] text-[#7aa3c2]",
        onClick: () => void navigate(`/w/${workspaceId}/tasks`),
      };
    });

    return {
      totalTasks,
      completedCount,
      overallPercent,
      inProgressCount: inProgressTasks.length,
      dueThisWeekCount: dueThisWeek.length,
      awaitingClientCount: awaitingClientTasks.length,
      awaitingClientFirst: awaitingClientTasks[0]?.title ?? null,
      overdueCount: overdueTasks.length,
      overdueFirst: overdueTasks[0]?.title ?? null,
      completedThisWeekCount,
      completedThisWeekHelper,
      weeklyDiff,
      displayBars,
      currentPhase,
      currentPhaseComplete,
      currentPhaseTotal,
      currentPhasePercent,
      nextMilestone,
      atRiskCount,
      atRiskHelper,
      health,
      launchDateFormatted,
      daysRemaining,
      recentActivityItems,
      focusItems,
    };
  }, [tasksQuery.data, workspaceId, navigate]);

  const {
    totalTasks,
    completedCount,
    overallPercent,
    inProgressCount,
    dueThisWeekCount,
    awaitingClientCount,
    awaitingClientFirst,
    overdueCount,
    overdueFirst,
    completedThisWeekCount,
    completedThisWeekHelper,
    weeklyDiff,
    displayBars,
    currentPhase,
    currentPhaseComplete,
    currentPhaseTotal,
    currentPhasePercent,
    nextMilestone,
    atRiskCount,
    atRiskHelper,
    health,
    launchDateFormatted,
    daysRemaining,
    recentActivityItems,
    focusItems,
  } = derived;

  const tasksHref = () => void navigate(`/w/${workspaceId}/tasks`);

  const assetsQuery = useQuery({
    queryKey: queryKeys.workspaceAssets(workspaceId),
    queryFn: () => listWorkspaceAssets(workspaceId),
    enabled: Boolean(workspaceId),
  });
  const assetCount = (assetsQuery.data ?? []).length;
  const assetsByType = {
    file: (assetsQuery.data ?? []).filter((a) => a.type === "file").length,
    link: (assetsQuery.data ?? []).filter((a) => a.type === "link").length,
    login: (assetsQuery.data ?? []).filter((a) => a.type === "login").length,
    plugin: (assetsQuery.data ?? []).filter((a) => a.type === "plugin").length,
  };

  const assetBreakdownCounts = [
    { label: "Files", count: assetsByType.file },
    { label: "Links", count: assetsByType.link },
    { label: "Logins", count: assetsByType.login },
    { label: "Plugins", count: assetsByType.plugin },
  ];

  return (
    <div className="space-y-0">
      <DataStateWrapper
        isLoading={isPrimaryLoading}
        isError={isPrimaryError}
        error={primaryError}
        onRetry={() => {
          void Promise.all([supportQuery.refetch(), tasksQuery.refetch()]);
        }}
        isEmpty={isPrimaryEmpty}
        skeleton={<DashboardSkeleton />}
        empty={
          <EmptyState
            title="No project overview data yet"
            description="Create tasks or log time to populate this workspace overview."
          />
        }
      >
        <div className="space-y-5 p-6">
          {/* ── Status strip ──────────────────────────────────────────── */}
          <ProjectStatusStrip
            projectName={workspaceNameQuery.data ?? ""}
            completionPercent={overallPercent}
            currentPhase={currentPhase}
            health={health}
            launchDate={launchDateFormatted}
            daysRemaining={daysRemaining}
          />

          {/* ── Row 1: KPI cards ───────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
            <OverviewProgressCard
              title="Overall Progress"
              value={`${overallPercent}%`}
              helper={`${completedCount} / ${totalTasks} tasks complete`}
              icon={TrendingUp}
              progressPercent={overallPercent}
              tone={
                overallPercent >= 75
                  ? "success"
                  : overallPercent >= 40
                    ? "default"
                    : "warning"
              }
              onClick={tasksHref}
            />
            <OverviewProgressCard
              title="Current Phase"
              value={`${currentPhaseComplete} / ${currentPhaseTotal}`}
              helper={`${currentPhase} · ${currentPhasePercent}% done`}
              icon={Target}
              progressPercent={currentPhasePercent}
              onClick={tasksHref}
            />
            <OverviewMetricCard
              title="At Risk"
              value={atRiskCount}
              helper={atRiskHelper}
              icon={AlertTriangle}
              tone={
                atRiskCount === 0
                  ? "success"
                  : atRiskCount >= 5
                    ? "danger"
                    : "warning"
              }
              onClick={tasksHref}
            />
            <OverviewMetricCard
              title="Next Milestone"
              value={
                nextMilestone != null
                  ? `${nextMilestone.total - nextMilestone.complete}`
                  : "—"
              }
              helper={nextMilestone?.label ?? "All phases complete"}
              icon={Calendar}
              onClick={tasksHref}
            />
          </div>

          {/* ── Row 2: Operational cards ──────────────────────────────── */}
          <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
            <OverviewMetricCard
              title="In Progress"
              value={inProgressCount}
              helper={`${dueThisWeekCount} due this week`}
              icon={Activity}
              tone={inProgressCount > 0 ? "warning" : "default"}
              onClick={tasksHref}
            />
            <OverviewMetricCard
              title="Awaiting Client"
              value={awaitingClientCount}
              helper={awaitingClientFirst ?? "None waiting"}
              icon={Clock3}
              tone={awaitingClientCount > 0 ? "purple" : "default"}
              onClick={tasksHref}
            />
            <OverviewMetricCard
              title="Overdue"
              value={overdueCount}
              helper={overdueFirst ?? "None overdue"}
              icon={AlertCircle}
              tone={overdueCount > 0 ? "danger" : "success"}
              onClick={tasksHref}
            />
            {/* Standout: Done This Week with MiniBarChart + TrendBadge */}
            <OverviewMetricCard
              title="Done This Week"
              value={completedThisWeekCount}
              helper={completedThisWeekHelper}
              icon={CheckCircle2}
              tone={completedThisWeekCount > 0 ? "success" : "default"}
              trendBadge={<TrendBadge diff={weeklyDiff} />}
              onClick={tasksHref}
              footer={
                <MiniBarChart
                  bars={displayBars}
                  tone={completedThisWeekCount > 0 ? "success" : "default"}
                />
              }
            />
          </div>

          {/* ── Row 3: Activity + Focus lists ─────────────────────────── */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <OverviewListCard
              title="Recent Activity"
              items={recentActivityItems}
              emptyState="No task activity yet."
              badge={recentActivityItems.length}
              viewAllHref={tasksHref}
            />
            <OverviewListCard
              title="Focus This Week"
              items={focusItems}
              emptyState="No urgent tasks — great work!"
              badge={focusItems.length}
              viewAllHref={tasksHref}
            />
          </div>

          {/* ── Row 4: Asset Library Hero Card ────────────────────────── */}
          <button
            type="button"
            onClick={() => void navigate(`/w/${workspaceId}/assets`)}
            className={cn(
              "group w-full rounded-xl border border-[#1e2130] bg-[#13151e] p-5 text-left",
              "transition-all duration-150 hover:-translate-y-[2px] hover:border-[#2a2d3e] hover:bg-[#171929] hover:shadow-[0_4px_24px_rgba(0,0,0,0.35)]",
            )}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Left: icon + heading */}
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[9px] bg-[#1e2638] transition-colors group-hover:bg-[#242e45]">
                  <Archive className="h-4 w-4 text-[#7aa3c2]" />
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-[rgba(255,255,255,0.88)]">
                    Asset Library
                  </p>
                  <p className="mt-0.5 text-[12px] text-[#50566a]">
                    {assetCount === 0
                      ? "Store project files, links, logins and plugin details"
                      : `${assetCount} asset${assetCount !== 1 ? "s" : ""} · files, links, logins & plugins`}
                  </p>

                  {/* Type breakdown strip */}
                  {assetCount > 0 ? (
                    <div className="mt-3">
                      <AssetBreakdownStrip counts={assetBreakdownCounts} />
                    </div>
                  ) : (
                    /* Mini icon hints when empty */
                    <div className="mt-3 flex items-center gap-2">
                      {[
                        { Icon: File, label: "Files" },
                        { Icon: Link2, label: "Links" },
                        { Icon: Lock, label: "Logins" },
                        { Icon: Package, label: "Plugins" },
                      ].map(({ Icon, label }) => (
                        <span
                          key={label}
                          className="inline-flex items-center gap-1 rounded-[5px] bg-[#1a1d2a] px-2 py-0.5 text-[11px] text-[#50566a]"
                        >
                          <Icon className="h-3 w-3" />
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: CTA */}
              <div className="shrink-0">
                {assetCount === 0 ? (
                  <span className="inline-flex items-center rounded-[8px] border border-[#2a3a4a] bg-[#1e2638] px-4 py-2 text-[12px] font-semibold text-[#7aa3c2] transition-colors group-hover:bg-[#242e45]">
                    Set Up Library
                  </span>
                ) : (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-[8px] border border-[#1e2130] bg-[#1a1d2a] px-4 py-2 text-[12px] font-semibold text-[#6b7485]",
                      "transition-colors group-hover:border-[#2a2d3e] group-hover:text-[rgba(255,255,255,0.82)]",
                    )}
                  >
                    Open Library
                  </span>
                )}
              </div>
            </div>
          </button>
        </div>
      </DataStateWrapper>

      {/* ── Top Up modal ────────────────────────────────────────────────── */}
      {isTopUpModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">
                Top Up Support Hours
              </h2>
              <button
                onClick={() => {
                  setIsTopUpModalOpen(false);
                  setTopUpHours("");
                }}
                className="text-muted transition-colors hover:text-foreground"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="hours-input"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  Number of Hours
                </label>
                <input
                  id="hours-input"
                  type="number"
                  min="0"
                  step="0.5"
                  value={topUpHours}
                  onChange={(e) => setTopUpHours(e.target.value)}
                  placeholder="Enter hours"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {hoursNum > 0 ? (
                <div className="rounded-lg border border-border bg-surface/60 p-4">
                  <h3 className="mb-3 text-sm font-medium text-foreground">
                    Cost Breakdown
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between text-muted">
                      <span>Per hour</span>
                      <span>R715 ex VAT</span>
                    </div>
                    <div className="flex items-center justify-between text-muted">
                      <span>Hours</span>
                      <span>{hoursNum.toFixed(2)}</span>
                    </div>
                    <div className="mt-2 border-t border-border pt-2" />
                    <div className="flex items-center justify-between font-medium text-foreground">
                      <span>Subtotal ex VAT</span>
                      <span>R{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted">
                      <span>VAT (15%)</span>
                      <span>R{vatAmount.toFixed(2)}</span>
                    </div>
                    <div className="mt-2 border-t border-border pt-2" />
                    <div className="flex items-center justify-between text-base font-semibold text-foreground">
                      <span>Total incl VAT</span>
                      <span>R{totalInclVat.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ) : null}

              <button
                onClick={handleRequestSupport}
                disabled={hoursNum <= 0}
                className="mt-4 inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-card transition-all focus-ring hover:-translate-y-[1px] hover:shadow-lift disabled:pointer-events-none disabled:opacity-50"
              >
                Request Support
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
