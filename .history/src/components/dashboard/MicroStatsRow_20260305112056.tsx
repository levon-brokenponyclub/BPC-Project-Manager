import { useEffect, useMemo, useState } from "react";
import { Activity, CalendarClock, CheckCircle2 } from "lucide-react";
import type { Task } from "@/types/models";

type MicroStatsTask = Pick<Task, "status" | "due_date" | "title" | "completed_at">;

interface MicroStatsRowProps {
  tasks: MicroStatsTask[];
}

function AnimatedValue({ value }: { value: string }): React.ReactElement {
  const [displayValue, setDisplayValue] = useState(value);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (value === displayValue) {
      return;
    }

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

export function MicroStatsRow({ tasks }: MicroStatsRowProps): React.ReactElement {
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
  } = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const activeTasksCount = tasks.filter(
      (task) => task.status === "In Progress" || task.status === "In Review",
    ).length;

    const completedTasks = tasks.filter((task) => task.status === "Complete");
    const hasCompletedAt = completedTasks.some((task) => Boolean(task.completed_at));

    let completedPrimary = `${completedTasks.length}`;
    let completedSecondary = "Tracking weekly soon";

    if (hasCompletedAt) {
      const sevenDaysAgo = new Date(startOfToday);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const fourteenDaysAgo = new Date(startOfToday);
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const completedThisWeek = completedTasks.filter((task) => {
        if (!task.completed_at) {
          return false;
        }
        const completedAt = new Date(task.completed_at);
        return completedAt >= sevenDaysAgo && completedAt <= now;
      }).length;

      const completedLastWeek = completedTasks.filter((task) => {
        if (!task.completed_at) {
          return false;
        }
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

    return {
      activeTasks: activeTasksCount,
      completedValue: completedPrimary,
      completedHelper: completedSecondary,
      nextDeadlineValue: nextValue,
      nextDeadlineHelper: nextHelper,
    };
  }, [tasks]);

  const cards = [
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
  ] as const;

  return (
    <section aria-label="Micro task statistics" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card, index) => (
        <article
          key={card.title}
          className={`rounded-2xl border border-border/80 bg-card px-4 py-3 shadow-card transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lift ${entered ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
          style={{ transitionDelay: `${index * 70}ms` }}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {card.title}
            </p>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
              <card.Icon
                className="h-4 w-4 text-muted"
                aria-hidden="true"
                focusable={false}
              />
              <span className="sr-only">{card.ariaLabel}</span>
            </div>
          </div>

          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">
            <AnimatedValue value={card.value} />
          </p>

          <p
            className={`mt-1 text-sm text-muted ${card.truncateHelper ? "truncate" : ""}`}
            title={card.truncateHelper ? card.helper : undefined}
          >
            {card.helper}
          </p>
        </article>
      ))}
    </section>
  );
}
