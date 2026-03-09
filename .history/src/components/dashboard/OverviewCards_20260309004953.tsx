/**
 * Reusable dashboard card primitives for the Project Overview page.
 * Designed to match the existing dark theme and Linear-inspired aesthetic.
 */
import type { ComponentType, ReactElement, ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";

// ─── Shared types ─────────────────────────────────────────────────────────────

export type CardTone = "default" | "success" | "warning" | "danger" | "purple";
export type ProjectHealth = "On Track" | "At Risk" | "Critical";

export interface PhaseEntry {
  label: string;
  complete: number;
  total: number;
  percent: number;
  isCurrent?: boolean;
  onClick?: () => void;
}

export interface ListItem {
  id: string;
  primary: string;
  secondary?: string;
  icon?: ComponentType<{ className?: string }>;
  iconColor?: string;
  onClick?: () => void;
}

export interface ProjectStatusStripProps {
  projectName: string;
  completionPercent: number;
  currentPhase: string;
  health: ProjectHealth;
  launchDate?: string | null;
  daysRemaining?: number | null;
}

export interface OverviewMetricCardProps {
  title: string;
  value: string | number;
  helper?: string;
  icon?: ComponentType<{ className?: string }>;
  footer?: ReactNode;
  tone?: CardTone;
  onClick?: () => void;
}

export interface PhaseBoardCardProps {
  title?: string;
  phases: PhaseEntry[];
}

export interface OverviewListCardProps {
  title: string;
  items: ListItem[];
  emptyState?: string;
  badge?: string | number;
}

// ─── Tone color maps ──────────────────────────────────────────────────────────

const TONE_VALUE: Record<CardTone, string> = {
  default: "text-primary",
  success: "text-status-complete",
  warning: "text-status-inprogress",
  danger: "text-red-500",
  purple: "text-status-awaiting-client",
};

const TONE_ICON_BG: Record<CardTone, string> = {
  default: "bg-primary/10 text-primary",
  success: "bg-status-complete/10 text-status-complete",
  warning: "bg-status-inprogress/10 text-status-inprogress",
  danger: "bg-red-500/10 text-red-500",
  purple: "bg-status-awaiting-client/10 text-status-awaiting-client",
};

const TONE_PROGRESS: Record<CardTone, string> = {
  default: "bg-primary",
  success: "bg-status-complete",
  warning: "bg-status-inprogress",
  danger: "bg-red-500",
  purple: "bg-status-awaiting-client",
};

const HEALTH_CONFIG: Record<ProjectHealth, { badge: string; dot: string }> = {
  "On Track": {
    badge:
      "bg-status-complete/10 text-status-complete border-status-complete/20",
    dot: "bg-status-complete",
  },
  "At Risk": {
    badge:
      "bg-status-inprogress/10 text-status-inprogress border-status-inprogress/20",
    dot: "bg-status-inprogress",
  },
  Critical: {
    badge: "bg-red-500/10 text-red-500 border-red-500/20",
    dot: "bg-red-500",
  },
};

// ─── MiniProgressBar ──────────────────────────────────────────────────────────

export function MiniProgressBar({
  percent,
  colorClass = "bg-primary",
}: {
  percent: number;
  colorClass?: string;
}): ReactElement {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-border/50">
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-out",
          colorClass,
        )}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}

// ─── ProjectStatusStrip ───────────────────────────────────────────────────────

export function ProjectStatusStrip({
  projectName,
  completionPercent,
  currentPhase,
  health,
  launchDate,
  daysRemaining,
}: ProjectStatusStripProps): ReactElement {
  const hc = HEALTH_CONFIG[health];
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-border bg-card px-5 py-3">
      {/* Name */}
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-primary" />
        <span className="text-[13px] font-semibold text-foreground">
          {projectName}
        </span>
      </div>

      <div className="h-4 w-px bg-border" />

      {/* Health badge */}
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-[4px] border px-2 py-0.5 text-[11px] font-semibold",
          hc.badge,
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", hc.dot)} />
        {health}
      </span>

      <div className="h-4 w-px bg-border" />

      {/* Phase */}
      <div className="flex items-center gap-1.5">
        <span className="text-[12px] text-muted">Phase</span>
        <span className="max-w-[160px] truncate text-[12px] font-medium text-foreground">
          {currentPhase}
        </span>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-1.5">
        <span className="text-[12px] text-muted">Progress</span>
        <span className="text-[12px] font-semibold text-foreground">
          {completionPercent}%
        </span>
      </div>

      {/* Launch date */}
      {launchDate ? (
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] text-muted">Target</span>
          <span className="text-[12px] font-medium text-foreground">
            {launchDate}
          </span>
        </div>
      ) : null}

      {/* Days remaining */}
      {daysRemaining != null ? (
        <div className="ml-auto">
          <span
            className={cn(
              "inline-flex items-center rounded-[4px] px-2 py-0.5 text-[11px] font-semibold",
              daysRemaining < 7
                ? "bg-red-500/10 text-red-500"
                : daysRemaining < 30
                  ? "bg-status-inprogress/10 text-status-inprogress"
                  : "bg-surface text-muted",
            )}
          >
            {daysRemaining > 0 ? `${daysRemaining}d remaining` : "Due today"}
          </span>
        </div>
      ) : null}
    </div>
  );
}

// ─── OverviewMetricCard ───────────────────────────────────────────────────────

export function OverviewMetricCard({
  title,
  value,
  helper,
  icon: Icon,
  footer,
  tone = "default",
  onClick,
}: OverviewMetricCardProps): ReactElement {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onClick();
            }
          : undefined
      }
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-border bg-card p-4",
        onClick
          ? "cursor-pointer transition-colors hover:border-border/80 hover:bg-surface"
          : "",
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          {title}
        </p>
        {Icon ? (
          <span
            className={cn(
              "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px]",
              TONE_ICON_BG[tone],
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>

      {/* Main value */}
      <div className="flex-1">
        <p
          className={cn(
            "text-[30px] font-semibold leading-none tracking-tight",
            TONE_VALUE[tone],
          )}
        >
          {value}
        </p>
        {helper ? (
          <p className="mt-1.5 text-[12px] leading-[16px] text-muted">
            {helper}
          </p>
        ) : null}
      </div>

      {/* Optional footer (e.g. progress bar) */}
      {footer ? <div className="mt-1">{footer}</div> : null}
    </div>
  );
}

// ─── OverviewProgressCard ────────────────────────────────────────────────────
// A variant of the metric card with a built-in progress bar.

export interface OverviewProgressCardProps {
  title: string;
  value: string | number;
  helper?: string;
  icon?: ComponentType<{ className?: string }>;
  progressPercent: number;
  tone?: CardTone;
  onClick?: () => void;
}

export function OverviewProgressCard({
  title,
  value,
  helper,
  icon,
  progressPercent,
  tone = "default",
  onClick,
}: OverviewProgressCardProps): ReactElement {
  return (
    <OverviewMetricCard
      title={title}
      value={value}
      helper={helper}
      icon={icon}
      tone={tone}
      onClick={onClick}
      footer={
        <MiniProgressBar
          percent={progressPercent}
          colorClass={TONE_PROGRESS[tone]}
        />
      }
    />
  );
}

// ─── PhaseBoardCard ───────────────────────────────────────────────────────────

export function PhaseBoardCard({
  title = "Project Phases",
  phases,
}: PhaseBoardCardProps): ReactElement {
  const totalComplete = phases.reduce((s, p) => s + p.complete, 0);
  const totalTasks = phases.reduce((s, p) => s + p.total, 0);

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          {title}
        </p>
        <span className="text-[12px] text-muted">
          {totalComplete} / {totalTasks} complete
        </span>
      </div>

      {phases.length === 0 ? (
        <p className="py-4 text-center text-[13px] text-muted">
          No phases found — add parent tasks to populate this board.
        </p>
      ) : (
        <div className="space-y-4">
          {phases.map((phase) => {
            const done = phase.percent >= 100;
            const active = (phase.isCurrent ?? false) && !done;

            return (
              <div
                key={phase.label}
                role={phase.onClick ? "button" : undefined}
                tabIndex={phase.onClick ? 0 : undefined}
                onClick={phase.onClick}
                onKeyDown={
                  phase.onClick
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ")
                          phase.onClick?.();
                      }
                    : undefined
                }
                className={cn(
                  "-mx-2 space-y-2 rounded-[6px] p-2 transition-colors",
                  phase.onClick && "cursor-pointer hover:bg-surface/60",
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Label + indicator */}
                  <div className="flex min-w-0 items-center gap-2">
                    {done ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-status-complete" />
                    ) : active ? (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                    ) : (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-border" />
                    )}
                    <span
                      className={cn(
                        "truncate text-[13px] font-medium leading-5",
                        done
                          ? "text-muted line-through"
                          : active
                            ? "text-foreground"
                            : "text-muted",
                      )}
                    >
                      {phase.label}
                    </span>
                    {active ? (
                      <span className="inline-flex shrink-0 items-center rounded-[3px] bg-primary/15 px-1.5 py-px text-[10px] font-semibold text-primary">
                        Active
                      </span>
                    ) : null}
                  </div>

                  {/* Stats */}
                  <div className="flex shrink-0 items-center gap-4">
                    <span className="text-[12px] tabular-nums text-muted">
                      {phase.complete}/{phase.total}
                    </span>
                    <span
                      className={cn(
                        "w-8 text-right text-[12px] font-semibold tabular-nums",
                        done
                          ? "text-status-complete"
                          : active
                            ? "text-primary"
                            : "text-muted",
                      )}
                    >
                      {phase.percent}%
                    </span>
                  </div>
                </div>

                <MiniProgressBar
                  percent={phase.percent}
                  colorClass={
                    done
                      ? "bg-status-complete"
                      : active
                        ? "bg-primary"
                        : "bg-border/60"
                  }
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── OverviewListCard ─────────────────────────────────────────────────────────

export function OverviewListCard({
  title,
  items,
  emptyState = "Nothing to show.",
  badge,
}: OverviewListCardProps): ReactElement {
  return (
    <div className="flex flex-col rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          {title}
        </p>
        {badge != null ? (
          <span className="inline-flex min-w-[18px] items-center justify-center rounded-[3px] bg-surface px-1.5 py-px text-[11px] font-medium text-muted">
            {badge}
          </span>
        ) : null}
      </div>

      {/* List */}
      <div className="flex-1 divide-y divide-border/30">
        {items.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-muted">
            {emptyState}
          </p>
        ) : (
          items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                role={item.onClick ? "button" : undefined}
                tabIndex={item.onClick ? 0 : undefined}
                onClick={item.onClick}
                onKeyDown={
                  item.onClick
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ")
                          item.onClick?.();
                      }
                    : undefined
                }
                className={cn(
                  "flex items-start gap-3 px-4 py-3",
                  item.onClick
                    ? "cursor-pointer transition-colors hover:bg-surface/60"
                    : "",
                )}
              >
                {Icon ? (
                  <span
                    className={cn(
                      "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px]",
                      item.iconColor ?? "bg-surface text-muted",
                    )}
                  >
                    <Icon className="h-3 w-3" />
                  </span>
                ) : (
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-border" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] leading-[18px] text-foreground">
                    {item.primary}
                  </p>
                  {item.secondary ? (
                    <p className="mt-px truncate text-[11px] text-muted">
                      {item.secondary}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
