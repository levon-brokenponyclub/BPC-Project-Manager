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
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { StatusPill } from "@/components/tasks/StatusPill";
import { Card } from "@/components/ui/card";
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

function UserAvatar({ email, avatarUrl }: { email: string | null; avatarUrl?: string | null }) {
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
    ]);
  };

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, patch }: { taskId: string; patch: Partial<Task> }) =>
      updateTask(taskId, patch),
    onSuccess: async (task) => {
      setSelectedTask({ ...selectedTask!, ...task });
      await logTaskActivity(task.id, "task_updated", {
        patch: "field updated",
      });
      await notifyWorkspaceEvent(workspaceId, "status_change", {
        taskId: task.id,
        status: task.status,
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
    onSuccess: async () => {
      if (!selectedTask) {
        return;
      }
      await logTaskActivity(selectedTask.id, "comment_added", {
        taskId: selectedTask.id,
      });
      await notifyWorkspaceEvent(workspaceId, "comment_added", {
        taskId: selectedTask.id,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.taskComments(selectedTask.id),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.taskActivity(selectedTask.id),
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

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
          Support Hours
        </h1>
        <p className="mt-1 text-sm text-muted">
          Prepaid retainer usage for this period.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <MetricCard label="Allocated" value={`${allocated.toFixed(2)}h`} />
          <MetricCard label="Used" value={`${used.toFixed(2)}h`} />
          <MetricCard label="Remaining" value={`${remaining.toFixed(2)}h`} />
        </div>

        <div className="mt-6 h-3 rounded-full bg-stone-50">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </Card>

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
                    <UserAvatar email={task.owner?.email || null} avatarUrl={task.owner?.avatar_url} />
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
                    <UserAvatar email={task.assignee?.email || null} avatarUrl={task.assignee?.avatar_url} />
                  </td>
                </tr>
              );
            })}
            {(recentTasksQuery.data ?? []).length === 0 && (
              <tr>
                <td
                  className="px-5 py-8 text-center text-sm text-muted"
                  colSpan={5}
                >
                  No tasks found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

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

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.ReactElement {
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4">
      <p className="text-xs uppercase tracking-wide text-muted font-medium">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
    </div>
  );
}
