import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { getWorkspaceSupportSummary, listTasksWithUsers } from "@/api";
import { MicroStatsRow } from "@/components/dashboard/MicroStatsRow";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { DataStateWrapper } from "@/components/ui/DataStateWrapper";
import { EmptyState } from "@/components/ui/EmptyState";
import { queryKeys } from "@/lib/queryKeys";
import { useToast } from "@/providers/ToastProvider";

export function ProjectOverviewPage(): React.ReactElement {
  const { workspaceId = "" } = useParams<{ workspaceId: string }>();
  const { showToast } = useToast();
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [topUpHours, setTopUpHours] = useState<string>("");

  const supportQuery = useQuery({
    queryKey: queryKeys.workspaceSupport(workspaceId),
    queryFn: () => getWorkspaceSupportSummary(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const recentTasksQuery = useQuery({
    queryKey: queryKeys.tasks(workspaceId, "All", ""),
    queryFn: () => listTasksWithUsers(workspaceId, { status: "All" }),
    enabled: Boolean(workspaceId),
  });

  const summary = supportQuery.data;
  const allocated = Number(summary?.hours_allocated ?? 0);
  const used = Number(summary?.hours_used ?? 0);
  const remaining = Number(summary?.hours_remaining ?? 0);
  const progress = allocated > 0 ? Math.min(100, (used / allocated) * 100) : 0;

  const isPrimaryLoading = supportQuery.isLoading || recentTasksQuery.isLoading;
  const isPrimaryError = supportQuery.isError || recentTasksQuery.isError;
  const primaryError = supportQuery.error ?? recentTasksQuery.error;
  const isPrimaryEmpty =
    !isPrimaryLoading &&
    (recentTasksQuery.data ?? []).length === 0 &&
    allocated === 0 &&
    used === 0 &&
    remaining === 0;

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

  return (
    <div className="space-y-6">
      <DataStateWrapper
        isLoading={isPrimaryLoading}
        isError={isPrimaryError}
        error={primaryError}
        onRetry={() => {
          void Promise.all([supportQuery.refetch(), recentTasksQuery.refetch()]);
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
        <section
          aria-label="Project overview"
          className="surface rounded-2xl border border-border p-5 shadow-card"
        >
          <header>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Project Overview
            </h1>
            <p className="mt-1 text-sm text-muted">
              Live progress and retainer usage
            </p>
          </header>

          <div className="mt-6">
            <MicroStatsRow tasks={recentTasksQuery.data ?? []} />
          </div>

          <div className="mt-6 rounded-2xl border border-border/70 bg-surface/70 p-4 md:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  Support Hours
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Prepaid retainer usage for this period.
                </p>
              </div>
              <button
                onClick={() => setIsTopUpModalOpen(true)}
                className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-card transition-all duration-200 ease-out hover:-translate-y-[1px] hover:shadow-lift focus-ring disabled:pointer-events-none disabled:opacity-50"
              >
                Top Up
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              <MetricCard label="Allocated" value={`${allocated.toFixed(2)}h`} />
              <MetricCard label="Used" value={`${used.toFixed(2)}h`} />
              <MetricCard label="Remaining" value={`${remaining.toFixed(2)}h`} />
            </div>

            <div className="mt-5 h-1.5 rounded-full bg-border/40">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </section>
      </DataStateWrapper>

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

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.ReactElement {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 md:px-5 md:py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1.5 text-xl font-semibold tracking-tight text-foreground md:text-2xl">
        {value}
      </p>
    </div>
  );
}
