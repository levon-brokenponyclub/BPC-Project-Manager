import { useEffect, useMemo, useState } from "react";
import { Activity, CalendarClock, CheckCircle2, Percent } from "lucide-react";
import type { Task } from "@/types/models";

type MicroStatsTask = Pick<
  Task,
  "status" | "due_date" | "title" | "completed_at"
>;

interface MicroStatsRowProps {
  tasks: MicroStatsTask[];
}

interface MicroStatCard {
  title: string;
  value: string;
  helper: string;
  Icon: React.ComponentType<{
    className?: string;
    "aria-hidden"?: boolean;
    focusable?: boolean;
  }>;
  ariaLabel: string;
  truncateHelper?: boolean;
  footer?: React.ReactNode; // ✅ optional extra UI (progress bar etc.)
}

function AnimatedValue({ value }: { value: string }): React.ReactElement {
  const [displayValue, setDisplayValue] = useState(value);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (value === displayValue) return;

    setVisible(false);
    const id = window.setTimeout(() => {
      setDisplayValue(value);
      setVisible(true);
    }, 120);

    return () => window.clearTimeout(id);
  }, [value, displayValue]);

  return (
    <span
      className={`inline-block transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
    >
      {displayValue}
    </span>
  );
}

function clamp(n: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, n));
}

export function MicroStatsRow({
  tasks,
}: MicroStatsRowProps): React.ReactElement {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  const {
    activeTasks,
    completedValue,
    completedHelper,
    nextDeadlineValue,
    nextDeadlineHelper,
    completionPercent,
    completionHelper,
    statusPercentHelper,
  } = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const total = tasks.length;

    const activeTasksCount = tasks.filter(
      (task) => task.status === "In Progress" || task.status === "In Review",
    ).length;

    const completedTasks = tasks.filter((task) => task.status === "Complete");
    const hasCompletedAt = completedTasks.some((task) =>
      Boolean(task.completed_at),
    );

    let completedPrimary = `${completedTasks.length}`;
    let completedSecondary = "Trac  ng weekly soon";

    if (hasCompletedAt) {
      const sevenDaysAgo = new Date(startOfToday);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const fourteenDaysAgo = new Date(startOfToday);
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const completedThisWeek = completedTasks.filter((task) => {
        if (!task.completed_at) return false;
        const completedAt = new Date(task.completed_at);
        return completedAt >= sevenDaysAgo && completedAt <= now;
      }).length;

      const completedLastWeek = completedTasks.filter((task) => {
        if (!task.completed_at) return false;
        const completedAt = new Date(task.completed_at);
        return completedAt >= fourteenDaysAgo && completedAt < sevenDaysAgo;
      }).length;

      completedPrimary = `${completedThisWeek}`;
      const diff = completedThisWeek - completedLastWeek;
      const diffPrefix = diff >= 0 ? "+" : "";
      completedSecondary = `Compared to last week: ${diffPrefix}${diff}`;
    }

    const upcomingTasks = tasks
      .filter((task) => task.status !== "Complete" && Boolean(task.due_date))
      .map((task) => ({ ...task, dueDate: new Date(task.due_date as string) }))
      .filter((task) => task.dueDate >= startOfToday)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    const next = upcomingTasks[0];
    const nextValue = next
      ? next.dueDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : "No date";
    const nextHelper = next ? next.title : "No open task deadlines";

    // ✅ Overall completion %
    const completion =
      total === 0 ? 0 : Math.round((completedTasks.length / total) * 100);
    const completionHelperText =
      total === 0
        ? "No tasks yet"
        : `${completedTasks.length}/${total} complete`;

    // ✅ Optional: status breakdown % (edit statuses if yours differ)
    const statuses = ["In Progress", "In Review", "Complete"] as const;
    const statusCounts = statuses.map((s) => ({
      status: s,
      count: tasks.filter((t) => t.status === s).length,
    }));
    const statusPercentText =
      total === 0
        ? "—"
        : statusCounts
            .map(
              ({ status, count }) =>
                `${status} ${Math.round((count / total) * 100)}%`,
            )
            .join(" • ");

    return {
      activeTasks: activeTasksCount,
      completedValue: completedPrimary,
      completedHelper: completedSecondary,
      nextDeadlineValue: nextValue,
      nextDeadlineHelper: nextHelper,
      completionPercent: completion,
      completionHelper: completionHelperText,
      statusPercentHelper: statusPercentText,
    };
  }, [tasks]);

  const cards: MicroStatCard[] = [
    {
      title: "Active Tasks",
      value: String(activeTasks),
      helper: "Currently being worked on",
      Icon: Activity,
      ariaLabel: "Active tasks",
    },
    {
      title: "Completed This Week",
      value: completedValue,
      helper: completedHelper,
      Icon: CheckCircle2,
      ariaLabel: "Completed this week",
    },
    {
      title: "Next Deadline",
      value: nextDeadlineValue,
      helper: nextDeadlineHelper,
      Icon: CalendarClock,
      ariaLabel: "Next deadline",
      truncateHelper: true,
    },
    {
      title: "Overall Progress",
      value: `${completionPercent}%`,
      helper: statusPercentHelper, // shows breakdown; swap to completionHelper if you prefer
      Icon: Percent,
      ariaLabel: "Overall progress",
      truncateHelper: true,
      footer: (
        <div className="mt-3">
          <div className="h-2 w-full rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${clamp(completionPercent)}%` }}
              aria-hidden="true"
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">{completionHelper}</p>
        </div>
      ),
    },
  ];

  return (
    <section
      aria-label="Micro task statistics"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      {cards.map((card, index) => (
        <article
          key={card.title}
          className={[
            // TailGrids-ish surface: light bg, soft border, subtle shadow
            "h-full rounded-2xl border border-slate-200/70 bg-white px-5 py-4 shadow-sm",
            "transition-all duration-200 ease-out hover:-translate-y-[2px] hover:shadow-md",
            entered
              ? "translate-y-0 opacity-100"
              : "translate-y-[6px] opacity-0",
          ].join(" ")}
          style={{ transitionDelay: `${index * 70}ms` }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {card.title}
              </p>
              <p className="mt-2 text-3xl font-semibold leading-none tracking-tight text-slate-900">
                <AnimatedValue value={card.value} />
              </p>
            </div>

            {/* icon chip */}
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              <card.Icon
                className="h-5 w-5 text-slate-600"
                aria-hidden={true}
                focusable={false}
              />
              <span className="sr-only">{card.ariaLabel}</span>
            </div>
          </div>

          <p
            className={`mt-2 text-sm text-slate-600 ${card.truncateHelper ? "truncate" : ""}`}
            title={card.truncateHelper ? card.helper : undefined}
          >
            {card.helper}
          </p>

          {card.footer}
        </article>
      ))}
    </section>
  );
}
