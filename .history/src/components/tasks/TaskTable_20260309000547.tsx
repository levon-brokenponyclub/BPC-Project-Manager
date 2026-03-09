import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, Paperclip } from "lucide-react";

import type { TaskWithUsers } from "@/api/tasks";
import { StatusPill } from "@/components/tasks/StatusPill";
import type { TaskStatus } from "@/types/models";

interface TaskTableProps {
  tasks: TaskWithUsers[];
  onOpen: (task: TaskWithUsers) => void;
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

export function TaskTable({
  tasks,
  onOpen,
}: TaskTableProps): React.ReactElement {
  // Track which parent task rows are expanded
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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
    <table className="w-full min-w-[640px] text-left text-sm">
      <thead>
        <tr className="h-10 border-b border-[#222330] bg-[#1E1F2A]">
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
            Status
          </th>
          <th className="px-6 text-xs font-medium uppercase tracking-wide text-[#97989E]">
            Progress
          </th>
          <th className="px-6 text-xs font-medium uppercase tracking-wide text-[#97989E]">
            Due Date
          </th>
          <th className="px-6 text-xs font-medium uppercase tracking-wide text-[#97989E]">
            Assignee
          </th>
        </tr>
      </thead>
      <tbody>
        {groupedTasks.map((group) => (
          <Fragment key={group.status}>
            <tr
              key={`${group.status}-header`}
              className="h-10 border-b border-[#222330] bg-[#1E1F2A]"
            >
              <td className="px-6" colSpan={5}>
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-[10px] text-xs">
                    <StatusGroupMarker status={group.status} />
                    <span className="font-medium text-[#E3E4EA]">
                      {group.label}
                    </span>
                    <span className="font-normal text-[#97989E]">
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
                    className="h-11 cursor-pointer border-b border-[#292B38] bg-[#191A22] transition-colors hover:bg-[#1E2030]"
                    onClick={() => onOpen(task)}
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        {/* Expand toggle (only rendered when subtasks exist) */}
                        <span className="w-4 shrink-0">
                          {hasSubtasks ? (
                            <button
                              type="button"
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
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <p className="truncate text-[13px] font-medium leading-4 text-[#E3E4EA]">
                            {task.title}
                          </p>
                          {hasSubtasks || hasAnyFiles ? (
                            <div className="flex items-center gap-3">
                              {hasSubtasks ? (
                                <div className="flex items-center gap-1.5">
                                  <div className="h-1 w-12 overflow-hidden rounded-full bg-[#292B38]">
                                    <div
                                      className="h-full rounded-full bg-[#5E6AD2] transition-all"
                                      style={{ width: `${progressPct}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] text-[#6B6D7A]">
                                    {completedSubtaskCount}/{subtasks.length}
                                  </span>
                                </div>
                              ) : null}
                              {hasAnyFiles ? (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-[#6B6D7A]">
                                  <Paperclip className="h-2.5 w-2.5" />
                                  {totalFileCount}
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 align-middle">
                      <StatusPill status={task.status} />
                    </td>
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
                    <td className="px-6 py-3.5 text-[#959699]">
                      {task.due_date ? (
                        <span className="inline-flex items-center gap-2 text-xs">
                          <DueDateIndicator status={dueDateStatus} />
                          <span>
                            {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        </span>
                      ) : (
                        <span className="text-xs">-</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 align-middle">
                      <div className="flex items-center">
                        <UserAvatar
                          email={task.assignee?.email || null}
                          avatarUrl={task.assignee?.avatar_url}
                        />
                      </div>
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
                                  <p className="max-w-[360px] truncate text-[12px] font-medium leading-4 text-[#C4C5CC]">
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
                            <td className="px-6 py-2.5 align-middle">
                              <StatusPill status={sub.status} />
                            </td>
                            <td className="px-6 py-2.5" />
                            <td className="px-6 py-2.5 text-[#959699]">
                              {sub.due_date ? (
                                <span className="inline-flex items-center gap-2 text-xs">
                                  <DueDateIndicator status={subDueDateStatus} />
                                  <span>
                                    {new Date(
                                      sub.due_date,
                                    ).toLocaleDateString()}
                                  </span>
                                </span>
                              ) : (
                                <span className="text-xs">-</span>
                              )}
                            </td>
                            <td className="px-6 py-2.5 align-middle">
                              <div className="flex items-center">
                                <UserAvatar
                                  email={sub.assignee?.email || null}
                                  avatarUrl={sub.assignee?.avatar_url}
                                />
                              </div>
                            </td>
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
    </div>
  );
}
