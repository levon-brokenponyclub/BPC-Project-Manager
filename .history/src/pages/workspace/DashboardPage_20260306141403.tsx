import { Fragment, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Plus } from "lucide-react";

import {
  addComment,
  createTask,
  deleteTask,
  deleteTaskFile,
  getSignedFileUrl,
  listComments,
  listTaskActivity,
  listTaskFiles,
  listTasksWithUsers,
  listTimeEntries,
  logTaskActivity,
  notifyWorkspaceEvent,
  updateTask,
  uploadTaskFile,
} from "@/api";
import type { TaskWithUsers } from "@/api/tasks";
import { getMyWorkspaceRole } from "@/api/workspaces";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { NewTaskModal } from "@/components/tasks/NewTaskModal";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { Card } from "@/components/ui/card";
import { DataStateWrapper } from "@/components/ui/DataStateWrapper";
import { EmptyState } from "@/components/ui/EmptyState";
import { queryKeys } from "@/lib/queryKeys";
import { getEffectiveRole, type RoleViewMode } from "@/lib/roleView";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import type { Task, TaskPriority, TaskStatus } from "@/types/models";

interface NewTaskInput {
  title: string;
  description: string;
  status: TaskStatus;
  due_date: string | null;
  assignee_user_id: string | null;
  priority?: TaskPriority;
}

interface CreateTaskPayload {
  input: NewTaskInput;
  files: File[];
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
  if (!email) return <span className="text-muted text-xs">-</span>;

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

export function DashboardPage(): React.ReactElement {
  const { workspaceId = "" } = useParams<{ workspaceId: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [selectedTask, setSelectedTask] = useState<TaskWithUsers | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [displayOpen, setDisplayOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);
  const filterPanelRef = useRef<HTMLDivElement | null>(null);
  const displayButtonRef = useRef<HTMLButtonElement | null>(null);
  const displayPanelRef = useRef<HTMLDivElement | null>(null);
  const roleViewMode: RoleViewMode = "admin";

  const roleQuery = useQuery({
    queryKey: ["workspace", workspaceId, "myRole"],
    queryFn: () => getMyWorkspaceRole(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const actualRole =
    roleQuery.data === "admin" || roleQuery.data === "client"
      ? roleQuery.data
      : null;
  const effectiveRole = getEffectiveRole(actualRole, roleViewMode);
  const canManageTasks =
    effectiveRole === "admin" || effectiveRole === "client";

  const recentTasksQuery = useQuery({
    queryKey: queryKeys.tasks(workspaceId, "All", ""),
    queryFn: () => listTasksWithUsers(workspaceId, { status: "All" }),
    enabled: Boolean(workspaceId),
  });

  const commentsQuery = useQuery({
    queryKey: queryKeys.taskComments(selectedTask?.id ?? ""),
    queryFn: () => listComments(selectedTask!.id),
    enabled: Boolean(selectedTask?.id),
  });

  const activityQuery = useQuery({
    queryKey: queryKeys.taskActivity(selectedTask?.id ?? ""),
    queryFn: () => listTaskActivity(selectedTask!.id),
    enabled: Boolean(selectedTask?.id),
  });

  const filesQuery = useQuery({
    queryKey: queryKeys.taskFiles(workspaceId, selectedTask?.id ?? ""),
    queryFn: () => listTaskFiles(workspaceId, selectedTask!.id),
    enabled: Boolean(workspaceId) && Boolean(selectedTask?.id),
  });

  const entriesQuery = useQuery({
    queryKey: queryKeys.timeEntries(workspaceId),
    queryFn: () => listTimeEntries(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const refreshWorkspaceData = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks(workspaceId, "All", ""),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications(workspaceId),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.unreadNotifications(workspaceId),
      }),
    ]);
  };

  const createTaskMutation = useMutation({
    mutationFn: async ({ input, files }: CreateTaskPayload) => {
      const createdTask = await createTask(workspaceId, input);
      for (const file of files) {
        await uploadTaskFile(workspaceId, createdTask.id, file);
      }
      return createdTask;
    },
    onSuccess: async (task) => {
      setIsNewTaskModalOpen(false);
      setSelectedTask(null);
      await logTaskActivity(task.id, "task_created", { title: task.title });
      await notifyWorkspaceEvent(workspaceId, "task.created", {
        taskId: task.id,
        taskTitle: task.title,
      });
      await refreshWorkspaceData();
      showToast("Task created successfully.");
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Failed to create task";
      showToast(message, "error");
    },
  });

  const openNewTaskModal = (): void => {
    setIsNewTaskModalOpen(true);
  };

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, patch }: { taskId: string; patch: Partial<Task> }) =>
      updateTask(taskId, patch),
    onSuccess: async (task) => {
      setSelectedTask(null);
      await logTaskActivity(task.id, "task_updated", {
        patch: "field updated",
      });
      await notifyWorkspaceEvent(workspaceId, "task.status_changed", {
        taskId: task.id,
        taskTitle: task.title,
        field: "status",
        from: (selectedTask?.status as string | undefined) ?? null,
        to: task.status,
      });
      await refreshWorkspaceData();
      showToast("Task updated successfully.");
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Failed to update task";
      showToast(message, "error");
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async ({
      taskId,
      taskTitle,
    }: {
      taskId: string;
      taskTitle: string;
    }) => {
      await deleteTask(taskId);
      return { taskId, taskTitle };
    },
    onSuccess: async ({ taskId, taskTitle }) => {
      await notifyWorkspaceEvent(workspaceId, "task.deleted", {
        taskId,
        taskTitle,
      });

      setSelectedTask(null);
      await refreshWorkspaceData();
      showToast("Task deleted successfully.");
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Failed to delete task";
      showToast(message, "error");
    },
  });

  const commentMutation = useMutation({
    mutationFn: ({ taskId, body }: { taskId: string; body: string }) =>
      addComment(taskId, body),
    onSuccess: async (_, vars) => {
      if (!selectedTask) {
        return;
      }
      await logTaskActivity(selectedTask.id, "comment_added", {
        taskId: selectedTask.id,
      });
      await notifyWorkspaceEvent(workspaceId, "comment.created", {
        taskId: selectedTask.id,
        taskTitle: selectedTask.title,
        commentPreview: vars.body.slice(0, 80),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.taskComments(selectedTask.id),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.taskActivity(selectedTask.id),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.notifications(workspaceId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.unreadNotifications(workspaceId),
      });
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: ({ taskId, file }: { taskId: string; file: File }) =>
      uploadTaskFile(workspaceId, taskId, file),
    onSuccess: async (_, vars) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.taskFiles(workspaceId, vars.taskId),
      });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async ({ fileId }: { fileId: string; taskId: string }) =>
      deleteTaskFile(fileId),
    onSuccess: async (_, vars) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.taskFiles(workspaceId, vars.taskId),
      });
    },
  });

  const downloadFileMutation = useMutation({
    mutationFn: async ({
      storagePath,
      fileName,
    }: {
      storagePath: string;
      fileName: string;
    }) => {
      const url = await getSignedFileUrl(storagePath);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
  });

  const handleDeleteTask = async (taskId: string): Promise<void> => {
    const confirmation = prompt(
      'To confirm deletion, type "DELETE" in all caps:',
    );
    if (confirmation !== "DELETE") {
      showToast("Task deletion cancelled.", "error");
      return;
    }

    const taskTitle =
      selectedTask?.id === taskId
        ? selectedTask.title
        : (recentTasksQuery.data ?? []).find((task) => task.id === taskId)
            ?.title ?? "Untitled task";

    await deleteTaskMutation.mutateAsync({ taskId, taskTitle });
  };

  const isPrimaryLoading = recentTasksQuery.isLoading;
  const isPrimaryError = recentTasksQuery.isError;
  const primaryError = recentTasksQuery.error;
  const isPrimaryEmpty =
    !isPrimaryLoading && (recentTasksQuery.data ?? []).length === 0;
  const visibleTasks = recentTasksQuery.data ?? [];
  const groupedTasks = statusGroups
    .map((group) => ({
      ...group,
      tasks: visibleTasks.filter((task) => task.status === group.status),
    }))
    .filter((group) => group.tasks.length > 0);

  useEffect(() => {
    const onDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;

      const filterButtonContains =
        filterButtonRef.current?.contains(target) ?? false;
      const filterPanelContains =
        filterPanelRef.current?.contains(target) ?? false;
      if (!filterButtonContains && !filterPanelContains) {
        setFilterOpen(false);
      }

      const displayButtonContains =
        displayButtonRef.current?.contains(target) ?? false;
      const displayPanelContains =
        displayPanelRef.current?.contains(target) ?? false;
      if (!displayButtonContains && !displayPanelContains) {
        setDisplayOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocumentMouseDown);
    return () => document.removeEventListener("mousedown", onDocumentMouseDown);
  }, []);

  return (
    <div className="relative space-y-6">
      <DataStateWrapper
        isLoading={isPrimaryLoading}
        isError={isPrimaryError}
        error={primaryError}
        onRetry={() => {
          void recentTasksQuery.refetch();
        }}
        isEmpty={isPrimaryEmpty}
        skeleton={<DashboardSkeleton />}
        empty={
          <EmptyState
            title="No dashboard data yet"
            description="Create tasks or log time to populate this workspace dashboard."
          />
        }
      >
        <Card className="relative overflow-visible">
          <div className="flex h-10 items-center justify-between border-b border-border/70 bg-surface/70 px-6 py-2">
            <div className="relative">
              <button
                ref={filterButtonRef}
                type="button"
                aria-label="Open filters"
                onClick={() => {
                  setFilterOpen((previous) => !previous);
                  setDisplayOpen(false);
                }}
                className="focus-ring inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium text-foreground transition-colors hover:bg-card/20"
              >
                <svg
                  viewBox="0 0 16 16"
                  className="h-4 w-4 text-muted"
                  aria-hidden="true"
                >
                  <path
                    d="M2.5 3.5h11M4.5 7.5h7M6.5 11.5h3"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
                <span>Filter</span>
              </button>

              {filterOpen ? (
                <div
                  ref={filterPanelRef}
                  className="absolute left-0 top-full z-20 mt-2 min-w-[220px] rounded-xl border border-border/70 bg-card p-2 shadow-card"
                >
                  <button
                    type="button"
                    className="focus-ring block w-full rounded-md px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface/60"
                  >
                    Status
                  </button>
                  <button
                    type="button"
                    className="focus-ring block w-full rounded-md px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface/60"
                  >
                    Assignee
                  </button>
                  <button
                    type="button"
                    className="focus-ring block w-full rounded-md px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface/60"
                  >
                    Due date
                  </button>
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  ref={displayButtonRef}
                  type="button"
                  aria-label="Open display options"
                  onClick={() => {
                    setDisplayOpen((previous) => !previous);
                    setFilterOpen(false);
                  }}
                  className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-card/40 px-2.5 py-1 text-sm font-medium text-foreground transition-colors hover:bg-card/70"
                >
                  <svg
                    viewBox="0 0 16 16"
                    className="h-4 w-4 text-muted"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 4h10M5.5 8h5M7 12h2"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span>Display</span>
                </button>

                {displayOpen ? (
                  <div
                    ref={displayPanelRef}
                    className="absolute right-0 top-full z-20 mt-2 min-w-[220px] rounded-xl border border-border/70 bg-card p-2 shadow-card"
                  >
                    <button
                      type="button"
                      className="focus-ring block w-full rounded-md px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface/60"
                    >
                      Compact
                    </button>
                    <button
                      type="button"
                      className="focus-ring block w-full rounded-md px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface/60"
                    >
                      Comfortable
                    </button>
                    <button
                      type="button"
                      className="focus-ring block w-full rounded-md px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface/60"
                    >
                      Show avatars
                    </button>
                  </div>
                ) : null}
              </div>

              {canManageTasks ? (
                <button
                  type="button"
                  onClick={openNewTaskModal}
                  disabled={createTaskMutation.isPending}
                  className="focus-ring inline-flex h-[23px] min-w-[85px] items-center justify-center rounded-[5px] border border-[#6C77E5] bg-[#5E69D1] px-2 text-[12px] font-medium leading-[15px] text-[#FEFEFF] shadow-[0px_4px_4px_-1px_rgba(0,0,0,0.05),0px_1px_1px_rgba(0,0,0,0.1)] transition-colors hover:bg-[#6A76EB] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  New Task
                </button>
              ) : null}
            </div>
          </div>

          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#222330] bg-[#1A1B25] text-xs uppercase tracking-wide text-[#97989E]">
              <tr>
                <th className="px-6 py-3 font-semibold">Task</th>
                <th className="px-6 py-3 font-semibold">Owner</th>
                <th className="px-6 py-3 font-semibold">Due Date</th>
                <th className="px-6 py-3 font-semibold">Assigned To</th>
              </tr>
            </thead>
            <tbody>
              {groupedTasks.map((group) => (
                <Fragment key={group.status}>
                  <tr
                    key={`${group.status}-header`}
                    className="h-9 border-b border-[#222330] bg-[#1E1F2A]"
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
                        <button
                          type="button"
                          aria-label={`Add task to ${group.label}`}
                          className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded text-[#999A9D] transition-colors hover:bg-card/50 hover:text-[#E3E4EA]"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
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
                        onClick={() => setSelectedTask(task)}
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
              {(recentTasksQuery.data ?? []).length === 0 ? (
                <tr>
                  <td
                    className="px-6 py-8 text-center text-sm text-muted"
                    colSpan={4}
                  >
                    No tasks found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Card>
      </DataStateWrapper>

      <NewTaskModal
        open={isNewTaskModalOpen}
        workspaceId={workspaceId}
        isSubmitting={createTaskMutation.isPending}
        onClose={() => setIsNewTaskModalOpen(false)}
        onCreateTask={async (input, files) => {
          await createTaskMutation.mutateAsync({ input, files });
        }}
      />

      <TaskDrawer
        open={Boolean(selectedTask)}
        task={selectedTask}
        isSavingTask={updateTaskMutation.isPending}
        workspaceId={workspaceId}
        currentUserId={user?.id ?? null}
        effectiveRole={effectiveRole}
        canManageTasks={canManageTasks}
        isDeletingTask={deleteTaskMutation.isPending}
        onClose={() => {
          setSelectedTask(null);
        }}
        onCreateTask={async (input, files) => {
          await createTaskMutation.mutateAsync({ input, files });
        }}
        onSaveTask={async (taskId, patch) => {
          await updateTaskMutation.mutateAsync({ taskId, patch });
        }}
        onDeleteTask={handleDeleteTask}
        comments={commentsQuery.data ?? []}
        isCommentsLoading={commentsQuery.isLoading}
        activity={activityQuery.data ?? []}
        files={filesQuery.data ?? []}
        timeEntries={entriesQuery.data ?? []}
        isUploadingFile={uploadFileMutation.isPending}
        isDeletingFile={deleteFileMutation.isPending}
        isDownloadingFile={downloadFileMutation.isPending}
        onAddComment={(body) => {
          if (!selectedTask) {
            return;
          }
          commentMutation.mutate({ taskId: selectedTask.id, body });
        }}
        onUploadFile={(taskId, file) =>
          uploadFileMutation.mutate({ taskId, file })
        }
        onDeleteFile={(fileId, taskId) =>
          deleteFileMutation.mutate({ fileId, taskId })
        }
        onDownloadFile={(storagePath, fileName) =>
          downloadFileMutation.mutate({ storagePath, fileName })
        }
      />
    </div>
  );
}
