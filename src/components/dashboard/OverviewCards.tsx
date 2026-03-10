/**
 * Reusable dashboard card primitives for the Project Overview page.
 * Visual system: premium dark palette inspired by data-sets.css direction.
 * Surfaces: deep ink/graphite. Borders: cool gray. Tones: restrained, not neon.
 */
import type { ComponentType, ReactElement, ReactNode } from "react";
import { CheckCircle2, ArrowRight } from "lucide-react";

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
  trendBadge?: ReactNode;
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
  viewAllHref?: () => void;
}

// ─── Design tokens ────────────────────────────────────────────────────────────
// Surfaces use semantic CSS-variable tokens from the project theme:
// Card surface:  bg-card  (--card)
// Inner surface: bg-surface (--surface)
// Border:        border-border (--border)
// Label:         text-muted (--muted)
// Value:         text-foreground (--foreground)
// Tones:         Tailwind named colors (emerald/amber/red/violet) with dark: variants

// Card container base classes (shared across all card types)
const CARD_BASE =
  "rounded-xl border bg-card border-border transition-all duration-150";

const CARD_CLICKABLE =
  "cursor-pointer hover:bg-surface hover:-translate-y-[2px]";

// ─── Tone maps ────────────────────────────────────────────────────────────────

// Metric value color per tone
const TONE_VALUE: Record<CardTone, string> = {
  default: "text-foreground",
  success: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-red-500 dark:text-red-400",
  purple: "text-violet-600 dark:text-violet-400",
};

// Icon chip: background + foreground
const TONE_ICON_BG: Record<CardTone, string> = {
  default: "bg-primary/10 text-primary",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  danger: "bg-red-500/10 text-red-500 dark:text-red-400",
  purple: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
};

// Progress bar fill per tone
const TONE_PROGRESS: Record<CardTone, string> = {
  default: "bg-primary",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  purple: "bg-violet-500",
};

// Tonal border tint (subtle accent on card edge)
const TONE_BORDER: Record<CardTone, string> = {
  default: "border-border",
  success: "border-border dark:border-emerald-500/20",
  warning: "border-border dark:border-amber-500/20",
  danger: "border-border dark:border-red-500/20",
  purple: "border-border dark:border-violet-500/20",
};

// Mini bar chart bar tint (non-active bars)
const TONE_BAR_MUTED: Record<CardTone, string> = {
  default: "bg-border",
  success: "bg-emerald-500/20",
  warning: "bg-amber-500/20",
  danger: "bg-red-500/20",
  purple: "bg-violet-500/20",
};

// Health badge config
const HEALTH_CONFIG: Record<ProjectHealth, { badge: string; dot: string }> = {
  "On Track": {
    badge:
      "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  "At Risk": {
    badge:
      "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  Critical: {
    badge: "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400",
    dot: "bg-red-500",
  },
};

// ─── TrendBadge ───────────────────────────────────────────────────────────────

export function TrendBadge({ diff }: { diff: number }): ReactElement {
  if (diff === 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold text-muted">
        Same as last wk
      </span>
    );
  }
  const positive = diff > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
        positive
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "bg-red-500/10 text-red-600 dark:text-red-400",
      )}
    >
      {positive ? "+" : ""}
      {diff} vs last wk
    </span>
  );
}

// ─── IconChip ─────────────────────────────────────────────────────────────────

export function IconChip({
  icon: Icon,
  tone = "default",
  size = "md",
}: {
  icon: ComponentType<{ className?: string }>;
  tone?: CardTone;
  size?: "sm" | "md" | "lg";
}): ReactElement {
  const sizeMap = {
    sm: { wrap: "h-6 w-6 rounded-[5px]", icon: "h-3 w-3" },
    md: { wrap: "h-8 w-8 rounded-[7px]", icon: "h-3.5 w-3.5" },
    lg: { wrap: "h-10 w-10 rounded-[9px]", icon: "h-4 w-4" },
  };
  const s = sizeMap[size];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        s.wrap,
        TONE_ICON_BG[tone],
      )}
    >
      <Icon className={s.icon} />
    </span>
  );
}

// ─── MiniProgressBar ──────────────────────────────────────────────────────────

export function MiniProgressBar({
  percent,
  colorClass = "bg-primary",
}: {
  percent: number;
  colorClass?: string;
}): ReactElement {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/60">
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-700 ease-out",
          colorClass,
        )}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}

// ─── MiniBarChart ─────────────────────────────────────────────────────────────

export function MiniBarChart({
  bars,
  tone = "default",
}: {
  bars: number[];
  tone?: CardTone;
}): ReactElement {
  const max = Math.max(...bars, 1);
  return (
    <div className="flex h-6 items-end gap-[3px]">
      {bars.map((v, i) => {
        const heightPct = Math.round((v / max) * 100);
        const isLast = i === bars.length - 1;
        return (
          <div
            key={i}
            className={cn(
              "w-[6px] rounded-sm transition-all duration-300",
              isLast ? TONE_PROGRESS[tone] : TONE_BAR_MUTED[tone],
            )}
            style={{ height: `${Math.max(10, (heightPct / 100) * 24)}px` }}
            title={`${v}`}
          />
        );
      })}
    </div>
  );
}

// ─── AssetBreakdownStrip ──────────────────────────────────────────────────────

export function AssetBreakdownStrip({
  counts,
}: {
  counts: { label: string; count: number }[];
}): ReactElement {
  const visible = counts.filter((c) => c.count > 0);
  if (visible.length === 0) return <></>;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visible.map(({ label, count }) => (
        <span
          key={label}
          className="inline-flex items-center gap-1 rounded-[5px] border border-border bg-surface px-2 py-0.5"
        >
          <span className="text-[13px] font-semibold tabular-nums text-foreground">
            {count}
          </span>
          <span className="text-[11px] capitalize text-muted">{label}</span>
        </span>
      ))}
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

  const daysChipClass =
    daysRemaining == null
      ? "bg-surface text-muted"
      : daysRemaining < 7
        ? "bg-red-500/10 text-red-600 dark:text-red-400"
        : daysRemaining < 30
          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
          : "bg-surface text-muted";

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card px-6 py-4">
      {/* Single restrained glow — far right, very subtle */}
      <div
        className="pointer-events-none absolute right-0 top-0 h-full w-56 opacity-50"
        style={{
          background:
            "radial-gradient(ellipse at 100% 50%, rgba(74,127,165,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative flex flex-wrap items-center gap-x-5 gap-y-2">
        {/* Project name */}
        <div className="flex items-center gap-2.5">
          <span className="h-[7px] w-[7px] rounded-full bg-primary" />
          <span className="text-[14px] font-semibold tracking-tight text-foreground">
            {projectName || "Project Overview"}
          </span>
        </div>

        {/* Health badge */}
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[11px] font-semibold",
            hc.badge,
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", hc.dot)} />
          {health}
        </span>

        <div className="h-3.5 w-px bg-border" />

        {/* Metric chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-[6px] bg-surface px-2.5 py-[5px] text-[11px] text-foreground">
            <span className="text-[10px] text-muted">Phase</span>
            <span className="max-w-[140px] truncate font-medium">
              {currentPhase}
            </span>
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-[6px] bg-surface px-2.5 py-[5px] text-[11px]">
            <span className="text-[10px] text-muted">Progress</span>
            <span className="font-semibold text-primary">
              {completionPercent}%
            </span>
          </span>

          {launchDate ? (
            <span className="inline-flex items-center gap-1.5 rounded-[6px] bg-surface px-2.5 py-[5px] text-[11px] text-foreground">
              <span className="text-[10px] text-muted">Target</span>
              <span className="font-medium">{launchDate}</span>
            </span>
          ) : null}

          {daysRemaining != null ? (
            <span
              className={cn(
                "inline-flex items-center rounded-[6px] px-2.5 py-[5px] text-[11px] font-semibold",
                daysChipClass,
              )}
            >
              {daysRemaining > 0 ? `${daysRemaining}d left` : "Due today"}
            </span>
          ) : null}
        </div>
      </div>
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
  trendBadge,
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
        CARD_BASE,
        TONE_BORDER[tone],
        "p-5",
        onClick ? CARD_CLICKABLE : "",
      )}
    >
      {/* Header: label + icon chip */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-muted">
          {title}
        </p>
        {Icon ? <IconChip icon={Icon} tone={tone} size="md" /> : null}
      </div>

      {/* Metric value row */}
      <div className="mt-3 flex flex-col gap-1">
        <div className="flex items-baseline gap-2">
          <p
            className={cn(
              "text-[30px] font-bold leading-none tracking-[-0.02em]",
              TONE_VALUE[tone],
            )}
          >
            {value}
          </p>
          {trendBadge ? <div className="mb-0.5">{trendBadge}</div> : null}
        </div>
        {helper ? (
          <p className="text-[11px] leading-[16px] text-muted/80">{helper}</p>
        ) : null}
      </div>

      {/* Footer slot */}
      {footer ? <div className="mt-4">{footer}</div> : null}
    </div>
  );
}

// ─── OverviewProgressCard ─────────────────────────────────────────────────────

export interface OverviewProgressCardProps {
  title: string;
  value: string | number;
  helper?: string;
  icon?: ComponentType<{ className?: string }>;
  progressPercent: number;
  tone?: CardTone;
  trendBadge?: ReactNode;
  onClick?: () => void;
}

export function OverviewProgressCard({
  title,
  value,
  helper,
  icon,
  progressPercent,
  tone = "default",
  trendBadge,
  onClick,
}: OverviewProgressCardProps): ReactElement {
  return (
    <OverviewMetricCard
      title={title}
      value={value}
      helper={helper}
      icon={icon}
      tone={tone}
      trendBadge={trendBadge}
      onClick={onClick}
      footer={
        <div className="space-y-1.5">
          <MiniProgressBar
            percent={progressPercent}
            colorClass={TONE_PROGRESS[tone]}
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted/60">
              {progressPercent < 100 ? "In progress" : "Complete"}
            </span>
            <span
              className={cn(
                "text-[10px] font-semibold tabular-nums",
                TONE_VALUE[tone],
              )}
            >
              {progressPercent}%
            </span>
          </div>
        </div>
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
    <div className={cn(CARD_BASE, "p-5")}>
      <div className="mb-5 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-muted">
          {title}
        </p>
        <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-muted">
          {totalComplete} / {totalTasks}
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
                  "-mx-2 space-y-2 rounded-[7px] p-2 transition-all duration-150",
                  phase.onClick &&
                    "cursor-pointer hover:bg-surface hover:translate-x-0.5",
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-2">
                    {done ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-status-complete" />
                    ) : active ? (
                      <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-primary" />
                    ) : (
                      <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-border" />
                    )}
                    <span
                      className={cn(
                        "truncate text-[13px] leading-5",
                        done
                          ? "font-normal text-muted/50 line-through"
                          : active
                            ? "font-semibold text-foreground"
                            : "font-medium text-muted",
                      )}
                    >
                      {phase.label}
                    </span>
                    {active ? (
                      <span className="inline-flex shrink-0 items-center rounded-full bg-primary/10 px-2 py-px text-[10px] font-semibold text-primary">
                        Active
                      </span>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-[11px] tabular-nums text-muted/60">
                      {phase.complete}/{phase.total}
                    </span>
                    <span
                      className={cn(
                        "w-8 text-right text-[11px] font-semibold tabular-nums",
                        done
                          ? "text-status-complete"
                          : active
                            ? "text-primary"
                            : "text-muted/60",
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
                        : "bg-border"
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
  viewAllHref,
}: OverviewListCardProps): ReactElement {
  return (
    <div className={cn(CARD_BASE, "flex flex-col")}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-muted">
            {title}
          </p>
          {badge != null ? (
            <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-semibold text-primary">
              {badge}
            </span>
          ) : null}
        </div>
        {viewAllHref ? (
          <button
            type="button"
            onClick={viewAllHref}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted transition-colors hover:text-primary"
          >
            View all
            <ArrowRight className="h-3 w-3" />
          </button>
        ) : null}
      </div>

      {/* List rows */}
      <div className="flex-1 divide-y divide-border">
        {items.length === 0 ? (
          <p className="px-5 py-8 text-center text-[13px] text-muted">
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
                  "flex items-start gap-3 px-5 py-3 transition-all duration-100",
                  item.onClick ? "cursor-pointer hover:bg-surface" : "",
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
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-border" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium leading-[18px] text-foreground">
                    {item.primary}
                  </p>
                  {item.secondary ? (
                    <p className="mt-px truncate text-[11px] leading-[15px] text-muted">
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
