import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock3,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";

import { getWorkspaceSupportSummary, listTasksWithSubtasks } from "@/api";
import type { TaskWithUsers } from "@/api/tasks";
import {
  OverviewListCard,
  OverviewMetricCard,
  OverviewProgressCard,
  PhaseBoardCard,
  ProjectStatusStrip,
} from "@/components/dashboard/OverviewCards";
import type {
  ListItem,
  PhaseEntry,
  ProjectHealth,
} from "@/components/dashboard/OverviewCards";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { DataStateWrapper } from "@/components/ui/DataStateWrapper";
import { EmptyState } from "@/components/ui/EmptyState";
import { timeAgo } from "@/lib/notifications/timeAgo";
import { queryKeys } from "@/lib/queryKeys";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/providers/ToastProvider";

export function ProjectOverviewPage(): React.ReactElement {
  const { workspaceId = "" } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
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

  const tasksQuery = useQuery({
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
    showToast(`Request for ${topUpHours} hours submitted successfully.`);
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

    const phases: PhaseEntry[] = phaseEntries.map((p) => ({
      ...p,
      isCurrent: p.label === currentPhase,
    }));

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
          ? `Overdue${
              t.due_date
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
          ? "bg-red-500/10 text-red-500"
          : isBlocked
            ? "bg-status-inprogress/10 text-status-inprogress"
            : "bg-primary/10 text-primary",
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
      phases,
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
    phases,
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
        <div className="space-y-4 p-6">
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
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
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
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
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
            <OverviewMetricCard
              title="Done This Week"
              value={completedThisWeekCount}
              helper={completedThisWeekHelper}
              icon={CheckCircle2}
              tone={completedThisWeekCount > 0 ? "success" : "default"}
              onClick={tasksHref}
            />
          </div>

          {/* ── Row 3: Activity + Focus lists ─────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <OverviewListCard
              title="Recent Activity"
              items={recentActivityItems}
              emptyState="No task activity yet."
              badge={recentActivityItems.length}
            />
            <OverviewListCard
              title="Focus This Week"
              items={focusItems}
              emptyState="No urgent tasks — great work!"
              badge={focusItems.length}
            />
          </div>

          {/* ── Row 4: Phase board ────────────────────────────────────── */}
          <PhaseBoardCard phases={phases} />
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
