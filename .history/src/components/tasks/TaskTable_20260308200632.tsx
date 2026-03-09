import { Fragment } from "react";

import type { TaskWithUsers } from "@/api/tasks";
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
  { status: "In Progress", label: "In Progress" },
  { status: "Complete", label: "Done" },
  { status: "Cancelled", label: "Cancelled" },
  { status: "In Review", label: "In Review" },
  { status: "Todo", label: "Todo" },
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

function formatTaskKey(taskId: string): string {
  const parts = taskId.split("-").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0].slice(0, 3).toUpperCase()}-${parts[1].slice(0, 2).toUpperCase()}`;
  }
  return taskId.slice(0, 6).toUpperCase();
}

export function TaskTable({
  tasks,
  onOpen,
}: TaskTableProps): React.ReactElement {
  const groupedTasks = statusGroups
    .map((group) => ({
      ...group,
      tasks: tasks.filter((task) => task.status === group.status),
    }))
    .filter((group) => group.tasks.length > 0);

  return (
    <table className="w-full text-left text-sm">
      <tbody>
        {groupedTasks.map((group) => (
          <Fragment key={group.status}>
            <tr
              key={`${group.status}-header`}
              className="h-10 border-b border-[#222330] bg-[#1E1F2A]"
            >
              <td className="px-6" colSpan={4}>
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
                  {/* <button
                          type="button"
                          aria-label={`Add task to ${group.label}`}
                          className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded text-[#999A9D] transition-colors hover:bg-card/50 hover:text-[#E3E4EA]"
                        >
                          <Plus className="h-4 w-4" />
                        </button> */}
                </div>
              </td>
            </tr>
            {group.tasks.map((task) => {
              const dueDateStatus = getDueDateStatus(
                task.due_date,
                task.status,
              );

              return (
                <tr
                  key={task.id}
                  className="h-11 cursor-pointer border-b border-[#292B38] bg-[#191A22] transition-colors hover:bg-[#1E2030]"
                  onClick={() => onOpen(task)}
                >
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <p className="w-[58px] text-[13px] font-normal leading-4 text-[#959699]">
                        {formatTaskKey(task.id)}
                      </p>
                      <StatusGroupMarker status={task.status} />
                      <p className="max-w-[420px] truncate text-[13px] font-medium leading-4 text-[#E3E4EA]">
                        {task.title}
                      </p>
                    </div>
                    {/* <p className="mt-1 flex items-center gap-1.5 pl-[69px] text-xs text-[#8A8D95]">
                      <MessageCircle className="h-3.5 w-3.5" />
                      {task.description?.slice(0, 72) || "No description"}
                    </p> */}
                  </td>
                  <td className="px-6 py-3.5 align-middle">
                    <div className="flex items-center">
                      <UserAvatar
                        email={task.owner?.email || null}
                        avatarUrl={task.owner?.avatar_url}
                      />
                    </div>
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
              );
            })}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}
