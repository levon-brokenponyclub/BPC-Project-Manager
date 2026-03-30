import { Fragment, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Flag,
  Paperclip,
  X,
} from "lucide-react";

import type { TaskWithUsers } from "@/api/tasks";
import { StatusPill } from "@/components/tasks/StatusPill";
import type { Task, TaskPriority, TaskStatus } from "@/types/models";

interface TaskTableProps {
  tasks: TaskWithUsers[];
  onOpen: (task: TaskWithUsers) => void;
  onUpdate?: (taskId: string, patch: Partial<Task>) => void;
}

interface StatusGroupDefinition {
  status: TaskStatus;
  label: string;
}

const statusGroups: StatusGroupDefinition[] = [
  { status: "Todo", label: "Todo" },
  { status: "Upcoming", label: "Upcoming" },
  { status: "In Progress", label: "In Progress" },
  { status: "In Review", label: "In Review" },
  { status: "Awaiting Client", label: "Awaiting Client" },
  { status: "On Hold", label: "On Hold" },
  { status: "Complete", label: "Done" },
  { status: "Cancelled", label: "Cancelled" },
];

type DueDateStatus = "on-time" | "at-risk" | "overdue";

function getDueDateStatus(
  dueDate: string | null,
  status: string,
): DueDateStatus | null {
  if (!dueDate || status === "Complete" || status === "Cancelled") {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil(
    (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays < 0) return "overdue";
  if (diffDays <= 2) return "at-risk";
  return "on-time";
}

function DueDateIndicator({ status }: { status: DueDateStatus | null }) {
  if (!status) return null;

  const colors = {
    "on-time": "bg-green-500",
    "at-risk": "bg-yellow-500",
    overdue: "bg-red-500",
  };

  return (
    <span className={`inline-block h-2 w-2 rounded-full ${colors[status]}`} />
  );
}

function UserAvatar({
  email,
  avatarUrl,
}: {
  email: string | null;
  avatarUrl?: string | null;
}) {
  if (!email) return <span className="text-muted">-</span>;

  const displayAvatarUrl = avatarUrl || "/defaultAvatar.png";

  return (
    <img
      src={displayAvatarUrl}
      alt={email}
      title={email}
      className="h-7 w-7 rounded-full border border-border object-cover hover:ring-2 hover:ring-primary/30 transition-all cursor-default"
    />
  );
}

function StatusGroupMarker({
  status,
}: {
  status: TaskStatus;
}): React.ReactElement {
  if (status === "In Progress") {
    return (
      <span className="relative inline-flex h-[14px] w-[14px] overflow-hidden rounded-full border-[1.5px] border-[#F2BE00]">
        <span className="absolute inset-y-0 left-0 w-1/2 rounded-l-full bg-[#F2BE00]" />
      </span>
    );
  }

  if (status === "Todo") {
    return (
      <span className="inline-flex h-[14px] w-[14px] rounded-full border-[1.5px] border-[#E2E2E2]" />
    );
  }

  if (status === "In Review") {
    return (
      <span className="relative inline-flex h-[14px] w-[14px] rounded-full border-[1.5px] border-[#F8C98A]">
        <span className="absolute inset-[3px] rounded-full bg-[#F8C98A]" />
      </span>
    );
  }

  if (status === "Cancelled") {
    return (
      <span className="relative inline-flex h-[14px] w-[14px] items-center justify-center rounded-full bg-[#95A2B3]">
        <span className="absolute h-[1.5px] w-[7px] rotate-45 bg-[#15161D]" />
        <span className="absolute h-[1.5px] w-[7px] -rotate-45 bg-[#15161D]" />
      </span>
    );
  }

  return (
    <span className="relative inline-flex h-[14px] w-[14px] rounded-full bg-[#5E6AD2]">
      <span className="absolute inset-[3px] rounded-full bg-[#15161D]" />
    </span>
  );
}

// ─── Priority cell ────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> =
  {
    Normal: { label: "Normal", color: "#95A2B3" },
    Medium: { label: "Medium", color: "#5E6AD2" },
    High: { label: "High", color: "#F2BE00" },
    Urgent: { label: "Urgent", color: "#E05C5C" },
  };

function PriorityCell({
  priority,
}: {
  priority?: TaskPriority | null;
}): React.ReactElement {
  if (!priority || !PRIORITY_CONFIG[priority]) {
    return <span className="text-[12px] text-[#4A4C5A]">—</span>;
  }
  const { label, color } = PRIORITY_CONFIG[priority];
  return (
    <span className="inline-flex items-center gap-1.5">
      <Flag className="h-3 w-3" style={{ color }} />
      <span className="text-[12px] font-medium" style={{ color }}>
        {label}
      </span>
    </span>
  );
}

// ─── Inline editor types ──────────────────────────────────────────────────────

type EditorTarget = {
  taskId: string;
  column: "status" | "due_date" | "priority";
  rect: DOMRect;
};

// ─── Status popover ───────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: "Todo", label: "Todo", color: "#EAB308" },
  { value: "Upcoming", label: "Upcoming", color: "#6366F1" },
  { value: "In Progress", label: "In Progress", color: "#F97316" },
  { value: "In Review", label: "In Review", color: "#EC4899" },
  { value: "Awaiting Client", label: "Awaiting Client", color: "#A855F7" },
  { value: "On Hold", label: "On Hold", color: "#94A3B8" },
  { value: "Complete", label: "Complete", color: "#22C55E" },
  { value: "Cancelled", label: "Cancelled", color: "#94A3B8" },
];

function InlineStatusEditor({
  current,
  anchorRect,
  onSelect,
  onClose,
}: {
  current: TaskStatus;
  anchorRect: DOMRect;
  onSelect: (s: TaskStatus) => void;
  onClose: () => void;
}): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        top: anchorRect.bottom + 4,
        left: anchorRect.left,
        zIndex: 9999,
      }}
      className="w-[200px] overflow-hidden rounded-[6px] border border-[#2A2C3A] bg-[#1B1C28] py-1 shadow-[0px_8px_24px_rgba(0,0,0,0.4)]"
    >
      {STATUS_OPTIONS.map(({ value, label, color }) => (
        <button
          key={value}
          type="button"
          className="flex w-full items-center gap-2.5 px-3 py-1.5 text-[13px] text-[#C4C5D0] transition-colors hover:bg-[#252636]"
          onClick={() => onSelect(value)}
        >
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="flex-1 text-left">{label}</span>
          {value === current && (
            <Check className="h-3.5 w-3.5 text-[#5E6AD2]" />
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Priority popover ─────────────────────────────────────────────────────────

const PRIORITY_OPTIONS: {
  value: TaskPriority;
  label: string;
  color: string;
}[] = [
  { value: "Urgent", label: "Urgent", color: "#E05C5C" },
  { value: "High", label: "High", color: "#F2BE00" },
  { value: "Medium", label: "Medium", color: "#5E6AD2" },
  { value: "Normal", label: "Normal", color: "#95A2B3" },
];

function InlinePriorityEditor({
  current,
  anchorRect,
  onSelect,
  onClose,
}: {
  current?: TaskPriority | null;
  anchorRect: DOMRect;
  onSelect: (p: TaskPriority | null) => void;
  onClose: () => void;
}): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        top: anchorRect.bottom + 4,
        left: anchorRect.left,
        zIndex: 9999,
      }}
      className="w-[160px] overflow-hidden rounded-[6px] border border-[#2A2C3A] bg-[#1B1C28] py-1 shadow-[0px_8px_24px_rgba(0,0,0,0.4)]"
    >
      {PRIORITY_OPTIONS.map(({ value, label, color }) => (
        <button
          key={value}
          type="button"
          className="flex w-full items-center gap-2.5 px-3 py-1.5 text-[13px] text-[#C4C5D0] transition-colors hover:bg-[#252636]"
          onClick={() => onSelect(value)}
        >
          <Flag className="h-3.5 w-3.5" style={{ color }} />
          <span className="flex-1 text-left">{label}</span>
          {value === current && (
            <Check className="h-3.5 w-3.5 text-[#5E6AD2]" />
          )}
        </button>
      ))}
      <div className="my-1 border-t border-[#2A2C3A]" />
      <button
        type="button"
        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-[13px] text-[#6B6D7A] transition-colors hover:bg-[#252636]"
        onClick={() => onSelect(null)}
      >
        <X className="h-3.5 w-3.5" />
        <span>Clear</span>
      </button>
    </div>
  );
}

// ─── Date popover ─────────────────────────────────────────────────────────────

function InlineDateEditor({
  current,
  anchorRect,
  onSelect,
  onClose,
}: {
  current: string | null;
  anchorRect: DOMRect;
  onSelect: (d: string | null) => void;
  onClose: () => void;
}): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(current ?? "");

  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        top: anchorRect.bottom + 4,
        left: anchorRect.left,
        zIndex: 9999,
      }}
      className="w-[220px] rounded-[6px] border border-[#2A2C3A] bg-[#1B1C28] p-3 shadow-[0px_8px_24px_rgba(0,0,0,0.4)]"
    >
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[#5F6272]">
        Due Date
      </p>
      <input
        type="date"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full rounded-[4px] border border-[#2A2C3A] bg-[#23243A] px-2 py-1.5 text-[13px] text-white focus:border-[#5E6AD2] focus:outline-none"
      />
      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          disabled={!value}
          className="flex-1 rounded-[4px] bg-[#5E6AD2] py-1 text-[12px] font-medium text-white transition-colors hover:bg-[#6A76DE] disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => {
            if (value) onSelect(value);
          }}
        >
          Set date
        </button>
        <button
          type="button"
          className="rounded-[4px] border border-[#2A2C3A] px-3 py-1 text-[12px] text-[#8B8C9E] transition-colors hover:bg-[#252636]"
          onClick={() => onSelect(null)}
        >
          Clear
        </button>
      </div>
    </div>
  );
}

export function TaskTable({
  tasks,
  onOpen,
  onUpdate,
}: TaskTableProps): React.ReactElement {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [openEditor, setOpenEditor] = useState<EditorTarget | null>(null);

  // Close editor when the page scrolls (e.g. the tasks list scrolls)
  useEffect(() => {
    if (!openEditor) return;
    const close = () => setOpenEditor(null);
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, [openEditor]);

  // Find a task or subtask by id across the full tree
  const findTask = (id: string): TaskWithUsers | undefined => {
    for (const t of tasks) {
      if (t.id === id) return t;
      const sub = t.subtasks?.find((s) => s.id === id);
      if (sub) return sub;
    }
    return undefined;
  };

  const parentIdsWithSubtasks = tasks
    .filter((task) => (task.subtasks?.length ?? 0) > 0)
    .map((task) => task.id);

  const hasAnySubtasks = parentIdsWithSubtasks.length > 0;
  const allExpanded =
    hasAnySubtasks && parentIdsWithSubtasks.every((id) => expandedIds.has(id));

  const toggleExpand = (taskId: string): void => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const toggleExpandAll = (): void => {
    setExpandedIds((prev) => {
      const shouldCollapse =
        parentIdsWithSubtasks.length > 0 &&
        parentIdsWithSubtasks.every((id) => prev.has(id));

      if (shouldCollapse) {
        const next = new Set(prev);
        parentIdsWithSubtasks.forEach((id) => next.delete(id));
        return next;
      }

      return new Set([...prev, ...parentIdsWithSubtasks]);
    });
  };

  const groupedTasks = statusGroups
    .map((group) => ({
      ...group,
      tasks: tasks.filter((task) => task.status === group.status),
    }))
    .filter((group) => group.tasks.length > 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm text-[#2D2D2E] dark:text-inherit">
        <thead>
          <tr className="h-10 border-b border-[#DCDCDC] bg-[#FBFBFB] dark:border-[#222330] dark:bg-[#1E1F2A]">
            <th className="px-6 text-xs font-medium uppercase tracking-wide text-[#97989E]">
              <div className="inline-flex items-center gap-2">
                {hasAnySubtasks ? (
                  <button
                    type="button"
                    onClick={toggleExpandAll}
                    aria-label={
                      allExpanded
                        ? "Collapse all subtasks"
                        : "Expand all subtasks"
                    }
                    className="inline-flex h-4 w-4 items-center justify-center rounded text-[#959699] transition-colors hover:text-[#E3E4EA]"
                  >
                    {allExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </button>
                ) : (
                  <span className="inline-flex h-4 w-4" />
                )}
                <span>Task</span>
              </div>
            </th>
            <th className="px-6 text-xs font-medium uppercase tracking-wide text-[#97989E]">
              Due Date
            </th>
            <th className="px-6 text-xs font-medium uppercase tracking-wide text-[#97989E]">
              Status
            </th>
            <th className="px-6 text-xs font-medium uppercase tracking-wide text-[#97989E]">
              Assignee
            </th>
            <th className="px-6 text-xs font-medium uppercase tracking-wide text-[#97989E]">
              Priority
            </th>
            <th className="px-6 text-xs font-medium uppercase tracking-wide text-[#97989E]">
              Progress
            </th>
          </tr>
        </thead>
        <tbody>
          {groupedTasks.map((group) => (
            <Fragment key={group.status}>
              <tr
                key={`${group.status}-header`}
                className="h-10 border-b border-[#E7E7E7] bg-[#ECECEC] dark:border-[#222330] dark:bg-[#1E1F2A]"
              >
                <td className="px-6" colSpan={6}>
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-[10px] text-xs">
                      <StatusGroupMarker status={group.status} />
                      <span className="font-medium text-[#2D2D2E] dark:text-[#E3E4EA]">
                        {group.label}
                      </span>
                      <span className="font-normal text-[#2D2D2E] dark:text-[#97989E]">
                        {group.tasks.length}
                      </span>
                    </div>
                  </div>
                </td>
              </tr>
              {group.tasks.map((task) => {
                const subtasks = task.subtasks ?? [];
                const hasSubtasks = subtasks.length > 0;
                const isExpanded = expandedIds.has(task.id);
                const dueDateStatus = getDueDateStatus(
                  task.due_date,
                  task.status,
                );
                const completedSubtaskCount = subtasks.filter(
                  (s) => s.status === "Complete",
                ).length;
                const progressPct = hasSubtasks
                  ? Math.round((completedSubtaskCount / subtasks.length) * 100)
                  : 0;
                const totalFileCount =
                  (task.file_count ?? 0) +
                  subtasks.reduce((sum, s) => sum + (s.file_count ?? 0), 0);
                const hasAnyFiles = totalFileCount > 0;

                return (
                  <Fragment key={task.id}>
                    {/* ── Parent task row ── */}
                    <tr
                      className="h-11 cursor-pointer border-b border-[#DCDCDC] bg-[#FBFBFB] transition-colors hover:bg-[#F3F3F3] dark:border-[#292B38] dark:bg-[#191A22] dark:hover:bg-[#1E2030]"
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest("[data-expand]"))
                          return;
                        if ((e.target as HTMLElement).closest("button")) return;
                        onOpen(task);
                      }}
                    >
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          {/* Expand toggle (only rendered when subtasks exist) */}
                          <span className="w-4 shrink-0">
                            {hasSubtasks ? (
                              <button
                                type="button"
                                data-expand="true"
                                aria-label={
                                  isExpanded
                                    ? "Collapse subtasks"
                                    : "Expand subtasks"
                                }
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpand(task.id);
                                }}
                                className="inline-flex h-4 w-4 items-center justify-center rounded text-[#959699] transition-colors hover:text-[#E3E4EA]"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5" />
                                )}
                              </button>
                            ) : null}
                          </span>
                          <StatusGroupMarker status={task.status} />
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <p className="truncate text-[13px] font-medium leading-4 text-[#2D2D2E] dark:text-[#E3E4EA]">
                              {task.title}
                            </p>
                            {hasAnyFiles ? (
                              <span className="inline-flex shrink-0 items-center gap-0.5 text-[10px] text-[#6B6D7A]">
                                <Paperclip className="h-2.5 w-2.5" />
                                {totalFileCount}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      {/* Due Date */}
                      <td
                        className="cursor-pointer px-6 py-3.5 text-[#2D2D2E] dark:text-[#959699] transition-colors hover:text-[#C4C5D0]"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenEditor({
                            taskId: task.id,
                            column: "due_date",
                            rect: e.currentTarget.getBoundingClientRect(),
                          });
                        }}
                      >
                        {task.due_date ? (
                          <span className="inline-flex items-center gap-2 text-xs">
                            <DueDateIndicator status={dueDateStatus} />
                            <span>
                              {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          </span>
                        ) : (
                          <span className="text-xs text-[#3A3C4A] hover:text-[#6B6D7A]">
                            Add date
                          </span>
                        )}
                      </td>
                      {/* Status */}
                      <td
                        className="cursor-pointer px-6 py-3.5 align-middle"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenEditor({
                            taskId: task.id,
                            column: "status",
                            rect: e.currentTarget.getBoundingClientRect(),
                          });
                        }}
                      >
                        <StatusPill status={task.status} />
                      </td>
                      {/* Assignee */}
                      <td className="px-6 py-3.5 align-middle">
                        <div className="flex items-center">
                          <UserAvatar
                            email={task.assignee?.email || null}
                            avatarUrl={task.assignee?.avatar_url}
                          />
                        </div>
                      </td>
                      {/* Priority */}
                      <td
                        className="cursor-pointer px-6 py-3.5 align-middle"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenEditor({
                            taskId: task.id,
                            column: "priority",
                            rect: e.currentTarget.getBoundingClientRect(),
                          });
                        }}
                      >
                        <PriorityCell priority={task.priority} />
                      </td>
                      {/* Progress */}
                      <td className="px-6 py-3.5 align-middle">
                        {hasSubtasks ? (
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#292B38]">
                              <div
                                className="h-full rounded-full bg-[#5E6AD2] transition-all"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-[#6B6D7A]">
                              {completedSubtaskCount}/{subtasks.length}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#4A4C5A]">—</span>
                        )}
                      </td>
                    </tr>

                    {/* ── Subtask rows (shown only when expanded) ── */}
                    {isExpanded
                      ? subtasks.map((sub) => {
                          const subDueDateStatus = getDueDateStatus(
                            sub.due_date,
                            sub.status,
                          );
                          return (
                            <tr
                              key={sub.id}
                              className="h-10 cursor-pointer border-b border-[#222230] bg-[#171820] transition-colors hover:bg-[#1B1D2A]"
                              onClick={() => onOpen(sub)}
                            >
                              <td className="py-2.5 pl-[72px] pr-6">
                                <div className="flex items-center gap-3">
                                  {/* indent guide line */}
                                  <span className="mr-1 inline-flex h-4 w-px shrink-0 bg-[#2E3040]" />
                                  <StatusGroupMarker status={sub.status} />
                                  <div className="flex min-w-0 flex-1 items-center gap-2">
                                    <p className="max-w-[360px] truncate text-[12px] font-medium leading-4 text-[#2D2D2E] dark:text-[#C4C5CC]">
                                      {sub.title}
                                    </p>
                                    {(sub.file_count ?? 0) > 0 ? (
                                      <span className="inline-flex shrink-0 items-center gap-0.5 text-[10px] text-[#6B6D7A]">
                                        <Paperclip className="h-2.5 w-2.5" />
                                        {sub.file_count}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </td>
                              {/* Due Date */}
                              <td
                                className="cursor-pointer px-6 py-2.5 text-[#2D2D2E] dark:text-[#959699] transition-colors hover:text-[#C4C5D0]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenEditor({
                                    taskId: sub.id,
                                    column: "due_date",
                                    rect: e.currentTarget.getBoundingClientRect(),
                                  });
                                }}
                              >
                                {sub.due_date ? (
                                  <span className="inline-flex items-center gap-2 text-xs">
                                    <DueDateIndicator
                                      status={subDueDateStatus}
                                    />
                                    <span>
                                      {new Date(
                                        sub.due_date,
                                      ).toLocaleDateString()}
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-xs text-[#3A3C4A] hover:text-[#6B6D7A]">
                                    Add date
                                  </span>
                                )}
                              </td>
                              {/* Status */}
                              <td
                                className="cursor-pointer px-6 py-2.5 align-middle"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenEditor({
                                    taskId: sub.id,
                                    column: "status",
                                    rect: e.currentTarget.getBoundingClientRect(),
                                  });
                                }}
                              >
                                <StatusPill status={sub.status} />
                              </td>
                              {/* Assignee */}
                              <td className="px-6 py-2.5 align-middle">
                                <div className="flex items-center">
                                  <UserAvatar
                                    email={sub.assignee?.email || null}
                                    avatarUrl={sub.assignee?.avatar_url}
                                  />
                                </div>
                              </td>
                              {/* Priority */}
                              <td
                                className="cursor-pointer px-6 py-2.5 align-middle"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenEditor({
                                    taskId: sub.id,
                                    column: "priority",
                                    rect: e.currentTarget.getBoundingClientRect(),
                                  });
                                }}
                              >
                                <PriorityCell priority={sub.priority} />
                              </td>
                              {/* Progress (n/a for subtasks) */}
                              <td className="px-6 py-2.5" />
                            </tr>
                          );
                        })
                      : null}
                  </Fragment>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>

      {/* ── Inline editors (fixed-position overlays) ── */}
      {(() => {
        if (!openEditor) return null;
        const target = findTask(openEditor.taskId);
        if (!target) return null;

        if (openEditor.column === "status") {
          return (
            <InlineStatusEditor
              current={target.status}
              anchorRect={openEditor.rect}
              onSelect={(status) => {
                onUpdate?.(openEditor.taskId, { status });
                setOpenEditor(null);
              }}
              onClose={() => setOpenEditor(null)}
            />
          );
        }

        if (openEditor.column === "priority") {
          return (
            <InlinePriorityEditor
              current={target.priority}
              anchorRect={openEditor.rect}
              onSelect={(priority) => {
                onUpdate?.(openEditor.taskId, { priority });
                setOpenEditor(null);
              }}
              onClose={() => setOpenEditor(null)}
            />
          );
        }

        // due_date
        return (
          <InlineDateEditor
            current={target.due_date}
            anchorRect={openEditor.rect}
            onSelect={(due_date) => {
              onUpdate?.(openEditor.taskId, { due_date });
              setOpenEditor(null);
            }}
            onClose={() => setOpenEditor(null)}
          />
        );
      })()}
    </div>
  );
}
