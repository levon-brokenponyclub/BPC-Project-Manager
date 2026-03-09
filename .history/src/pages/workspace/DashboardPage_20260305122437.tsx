import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import {
  addComment,
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
  getWorkspaceSupportSummary,
} from "@/api";
import type { TaskWithUsers } from "@/api/tasks";
import { getMyWorkspaceRole } from "@/api/workspaces";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { MicroStatsRow } from "@/components/dashboard/MicroStatsRow";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { StatusPill } from "@/components/tasks/StatusPill";
import { Card } from "@/components/ui/card";
import { DataStateWrapper } from "@/components/ui/DataStateWrapper";
import { EmptyState } from "@/components/ui/EmptyState";
import { queryKeys } from "@/lib/queryKeys";
import { getEffectiveRole, type RoleViewMode } from "@/lib/roleView";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import type { Task } from "@/types/models";

type DueDateStatus = "on-time" | "at-risk" | "overdue";

function getDueDateStatus(
  dueDate: string | null,
  status: string,
): DueDateStatus | null {
  if (!dueDate || status === "Complete") return null;

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
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [topUpHours, setTopUpHours] = useState<string>("");
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
        queryKey: queryKeys.workspaceSupport(workspaceId),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications(workspaceId),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.unreadNotifications(workspaceId),
      }),
    ]);
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
    mutationFn: (taskId: string) => deleteTask(taskId),
    onSuccess: async () => {
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

    await deleteTaskMutation.mutateAsync(taskId);
  };

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

  // Top-up cost calculations
  const RATE_PER_HOUR = 715; // R715 ex VAT
  const VAT_RATE = 0.15; // 15% VAT
  const hoursNum = parseFloat(topUpHours) || 0;
  const subtotal = hoursNum * RATE_PER_HOUR;
  const vatAmount = subtotal * VAT_RATE;
  const totalInclVat = subtotal + vatAmount;

  const handleRequestSupport = () => {
    // This will be wired up later
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
          void Promise.all([
            supportQuery.refetch(),
            recentTasksQuery.refetch(),
          ]);
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

          <div className="mt-6 rounded-2xl border border-border/70 bg-stone-50/60 p-4 md:p-5">
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
              <MetricCard
                label="Allocated"
                value={`${allocated.toFixed(2)}h`}
              />
              <MetricCard label="Used" value={`${used.toFixed(2)}h`} />
              <MetricCard
                label="Remaining"
                value={`${remaining.toFixed(2)}h`}
              />
            </div>

            <div className="mt-5 h-1.5 rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </section>

        <Card className="overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="text-base font-semibold text-foreground">
              Recent Tasks
            </h2>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-stone-50/70 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Task</th>
                <th className="px-5 py-3 font-semibold">Owner</th>
                <th className="px-5 py-3 font-semibold">Due Date</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Assigned To</th>
              </tr>
            </thead>
            <tbody>
              {(recentTasksQuery.data ?? []).slice(0, 8).map((task) => {
                const dueDateStatus = getDueDateStatus(
                  task.due_date,
                  task.status,
                );
                return (
                  <tr
                    key={task.id}
                    className="cursor-pointer border-b border-border/70 transition-colors hover:bg-stone-50/70"
                    onClick={() => setSelectedTask(task)}
                  >
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-foreground">
                        {task.title}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <UserAvatar
                        email={task.owner?.email || null}
                        avatarUrl={task.owner?.avatar_url}
                      />
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {task.due_date ? (
                        <span className="inline-flex items-center gap-2">
                          <DueDateIndicator status={dueDateStatus} />
                          <span className="text-xs">
                            {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        </span>
                      ) : (
                        <span className="text-xs">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <StatusPill status={task.status} />
                    </td>
                    <td className="px-5 py-3">
                      <UserAvatar
                        email={task.assignee?.email || null}
                        avatarUrl={task.assignee?.avatar_url}
                      />
                    </td>
                  </tr>
                );
              })}
              {(recentTasksQuery.data ?? []).length === 0 ? (
                <tr>
                  <td
                    className="px-5 py-8 text-center text-sm text-muted"
                    colSpan={5}
                  >
                    No tasks found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Card>
      </DataStateWrapper>

      <TaskDrawer
        open={Boolean(selectedTask)}
        task={selectedTask}
        isNewTask={false}
        isCreatingTask={false}
        isSavingTask={updateTaskMutation.isPending}
        workspaceId={workspaceId}
        currentUserId={user?.id ?? null}
        effectiveRole={effectiveRole}
        canManageTasks={canManageTasks}
        isDeletingTask={deleteTaskMutation.isPending}
        onClose={() => {
          setSelectedTask(null);
        }}
        onCreateTask={async () => {
          // Not used on dashboard
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

      {/* Top Up Modal */}
      {isTopUpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">
                Top Up Support Hours
              </h2>
              <button
                onClick={() => {
                  setIsTopUpModalOpen(false);
                  setTopUpHours("");
                }}
                className="text-muted hover:text-foreground transition-colors"
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
                  className="block text-sm font-medium text-foreground mb-2"
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
                  className="w-full px-3 py-2 border border-border rounded-lg text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {hoursNum > 0 && (
                <div className="border border-border rounded-lg p-4 bg-stone-50/50">
                  <h3 className="text-sm font-medium text-foreground mb-3">
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
                    <div className="border-t border-border pt-2 mt-2" />
                    <div className="flex items-center justify-between font-medium text-foreground">
                      <span>Subtotal ex VAT</span>
                      <span>R{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted">
                      <span>VAT (15%)</span>
                      <span>R{vatAmount.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-border pt-2 mt-2" />
                    <div className="flex items-center justify-between font-semibold text-foreground text-base">
                      <span>Total incl VAT</span>
                      <span>R{totalInclVat.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleRequestSupport}
                disabled={hoursNum <= 0}
                className="w-full mt-4 inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium focus-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-white shadow-card hover:shadow-lift hover:-translate-y-[1px] transition-all h-10 px-4 py-2"
              >
                Request Support
              </button>
            </div>
          </div>
        </div>
      )}
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
      <p className="text-xs uppercase tracking-wide text-muted font-medium">
        {label}
      </p>
      <p className="mt-1.5 text-xl font-semibold tracking-tight text-foreground md:text-2xl">
        {value}
      </p>
    </div>
  );
}
