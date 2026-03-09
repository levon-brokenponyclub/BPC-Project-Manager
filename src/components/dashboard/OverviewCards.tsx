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
// All hardcoded based on the premium data-sets.css direction:
// card bg: #0B0D12 → use the existing --background / #0e1016 style
// Card surface:  slightly lifted from bg: #13151e
// Border:        very subtle cool gray: #1e2130
// Hover surface: #171929
// Label:         #6b7485 (cool slate, calmer than the orange system)
// Value:         rgba(255,255,255,0.88) — soft off-white

// Card container base classes (shared across all card types)
const CARD_BASE =
  "rounded-xl border bg-[#13151e] border-[#1e2130] transition-all duration-150";

const CARD_CLICKABLE =
  "cursor-pointer hover:bg-[#171929] hover:border-[#2a2d3e] hover:-translate-y-[2px] hover:shadow-[0_4px_24px_rgba(0,0,0,0.35)]";

// ─── Tone maps ────────────────────────────────────────────────────────────────

// Metric value color per tone
const TONE_VALUE: Record<CardTone, string> = {
  default: "text-[rgba(255,255,255,0.88)]",
  success: "text-[#4ade80]",          // emerald — elegant, not neon
  warning: "text-[#d4a84b]",          // warm amber/bronze, not loud orange
  danger: "text-[#f87171]",          // muted coral-red, not alarm red
  purple: "text-[#a78bfa]",          // soft violet, not candy purple
};

// Icon chip: background + foreground
const TONE_ICON_BG: Record<CardTone, string> = {
  default: "bg-[#1e2638] text-[#7aa3c2]",     // slate-blue chip — cool neutral
  success: "bg-[#162820] text-[#4ade80]",      // deep emerald tint
  warning: "bg-[#231c10] text-[#d4a84b]",      // deep amber tint
  danger: "bg-[#28141a] text-[#f87171]",      // deep rose tint
  purple: "bg-[#1c1730] text-[#a78bfa]",      // deep violet tint
};

// Progress bar fill per tone
const TONE_PROGRESS: Record<CardTone, string> = {
  default: "bg-[#4a7fa5]",     // cool steel-blue
  success: "bg-[#22c55e]",     // rich emerald
  warning: "bg-[#c49a3a]",     // warm bronze
  danger: "bg-[#e05c5c]",     // muted rose-red
  purple: "bg-[#8b5cf6]",     // medium violet
};

// Tonal border tint (subtle accent on card edge)
const TONE_BORDER: Record<CardTone, string> = {
  default: "border-[#1e2130]",
  success: "border-[#1e3028]",   // very faint emerald edge
  warning: "border-[#2e2015]",   // very faint amber edge
  danger: "border-[#2e1a1f]",   // very faint rose edge
  purple: "border-[#201830]",   // very faint violet edge
};

// Inset shadow glow — only for danger/warning, very restrained
const TONE_GLOW: Record<CardTone, string> = {
  default: "",
  success: "",
  warning: "shadow-[inset_0_0_0_1px_rgba(196,154,58,0.07)]",
  danger: "shadow-[inset_0_0_0_1px_rgba(224,92,92,0.07)]",
  purple: "",
};

// Mini bar chart bar tint (non-active bars)
const TONE_BAR_MUTED: Record<CardTone, string> = {
  default: "bg-[#2a3a4a]",
  success: "bg-[#163826]",
  warning: "bg-[#2e2010]",
  danger: "bg-[#2e1820]",
  purple: "bg-[#201838]",
};

// Health badge config
const HEALTH_CONFIG: Record<ProjectHealth, { badge: string; dot: string }> = {
  "On Track": {
    badge: "bg-[#162820] text-[#4ade80] border-[#1e3828]",
    dot: "bg-[#22c55e]",
  },
  "At Risk": {
    badge: "bg-[#231c10] text-[#d4a84b] border-[#2e2415]",
    dot: "bg-[#c49a3a]",
  },
  Critical: {
    badge: "bg-[#28141a] text-[#f87171] border-[#36181e]",
    dot: "bg-[#e05c5c]",
  },
};

// ─── TrendBadge ───────────────────────────────────────────────────────────────

export function TrendBadge({ diff }: { diff: number }): ReactElement {
  if (diff === 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-[#1e2130] px-2 py-0.5 text-[10px] font-semibold text-[#6b7485]">
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
          ? "bg-[#162820] text-[#4ade80]"
          : "bg-[#28141a] text-[#f87171]",
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
  colorClass = "bg-[#4a7fa5]",
}: {
  percent: number;
  colorClass?: string;
}): ReactElement {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1a1d2a]">
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
          className="inline-flex items-center gap-1 rounded-[5px] border border-[#242636] bg-[#1a1d2a] px-2 py-0.5"
        >
          <span className="text-[13px] font-semibold tabular-nums text-[rgba(255,255,255,0.82)]">
            {count}
          </span>
          <span className="text-[11px] capitalize text-[#6b7485]">{label}</span>
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
      ? "bg-[#1a1d2a] text-[#6b7485]"
      : daysRemaining < 7
        ? "bg-[#28141a] text-[#f87171]"
        : daysRemaining < 30
          ? "bg-[#231c10] text-[#d4a84b]"
          : "bg-[#1a1d2a] text-[#6b7485]";

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-[#1e2130] bg-[#0f1118] px-6 py-4"
    >
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
          <span className="h-[7px] w-[7px] rounded-full bg-[#4a7fa5]" />
          <span className="text-[14px] font-semibold tracking-tight text-[rgba(255,255,255,0.9)]">
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

        <div className="h-3.5 w-px bg-[#1e2130]" />

        {/* Metric chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-[6px] bg-[#1a1d2a] px-2.5 py-[5px] text-[11px] text-[rgba(255,255,255,0.82)]">
            <span className="text-[10px] text-[#6b7485]">Phase</span>
            <span className="max-w-[140px] truncate font-medium">{currentPhase}</span>
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-[6px] bg-[#1a1d2a] px-2.5 py-[5px] text-[11px]">
            <span className="text-[10px] text-[#6b7485]">Progress</span>
            <span className="font-semibold text-[#4a7fa5]">{completionPercent}%</span>
          </span>

          {launchDate ? (
            <span className="inline-flex items-center gap-1.5 rounded-[6px] bg-[#1a1d2a] px-2.5 py-[5px] text-[11px] text-[rgba(255,255,255,0.82)]">
              <span className="text-[10px] text-[#6b7485]">Target</span>
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
        TONE_GLOW[tone],
        "p-5",
        onClick ? CARD_CLICKABLE : "",
      )}
    >
      {/* Header: label + icon chip */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-[#6b7485]">
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
          <p className="text-[11px] leading-[16px] text-[#50566a]">{helper}</p>
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
            <span className="text-[10px] text-[#42485a]">
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
        <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-[#6b7485]">
          {title}
        </p>
        <span className="rounded-full bg-[#1a1d2a] px-2 py-0.5 text-[11px] font-medium text-[#6b7485]">
          {totalComplete} / {totalTasks}
        </span>
      </div>

      {phases.length === 0 ? (
        <p className="py-4 text-center text-[13px] text-[#50566a]">
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
                  "cursor-pointer hover:bg-[#171929] hover:translate-x-0.5",
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-2">
                    {done ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#22c55e]" />
                    ) : active ? (
                      <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-[#4a7fa5]" />
                    ) : (
                      <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-[#2a2d3e]" />
                    )}
                    <span
                      className={cn(
                        "truncate text-[13px] leading-5",
                        done
                          ? "font-normal text-[#42485a] line-through"
                          : active
                            ? "font-semibold text-[rgba(255,255,255,0.88)]"
                            : "font-medium text-[#6b7485]",
                      )}
                    >
                      {phase.label}
                    </span>
                    {active ? (
                      <span className="inline-flex shrink-0 items-center rounded-full bg-[#1e2638] px-2 py-px text-[10px] font-semibold text-[#7aa3c2]">
                        Active
                      </span>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-[11px] tabular-nums text-[#42485a]">
                      {phase.complete}/{phase.total}
                    </span>
                    <span
                      className={cn(
                        "w-8 text-right text-[11px] font-semibold tabular-nums",
                        done
                          ? "text-[#22c55e]"
                          : active
                            ? "text-[#7aa3c2]"
                            : "text-[#42485a]",
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
                      ? "bg-[#22c55e]"
                      : active
                        ? "bg-[#4a7fa5]"
                        : "bg-[#242636]"
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
      <div className="flex items-center justify-between border-b border-[#1e2130] px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-[#6b7485]">
            {title}
          </p>
          {badge != null ? (
            <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-[#1e2638] px-1.5 py-px text-[10px] font-semibold text-[#7aa3c2]">
              {badge}
            </span>
          ) : null}
        </div>
        {viewAllHref ? (
          <button
            type="button"
            onClick={viewAllHref}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#50566a] transition-colors hover:text-[#7aa3c2]"
          >
            View all
            <ArrowRight className="h-3 w-3" />
          </button>
        ) : null}
      </div>

      {/* List rows */}
      <div className="flex-1 divide-y divide-[#191c28]">
        {items.length === 0 ? (
          <p className="px-5 py-8 text-center text-[13px] text-[#50566a]">
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
                  item.onClick
                    ? "cursor-pointer hover:bg-[#171929]"
                    : "",
                )}
              >
                {Icon ? (
                  <span
                    className={cn(
                      "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px]",
                      item.iconColor ?? "bg-[#1a1d2a] text-[#6b7485]",
                    )}
                  >
                    <Icon className="h-3 w-3" />
                  </span>
                ) : (
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#2a2d3e]" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium leading-[18px] text-[rgba(255,255,255,0.82)]">
                    {item.primary}
                  </p>
                  {item.secondary ? (
                    <p className="mt-px truncate text-[11px] leading-[15px] text-[#50566a]">
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
