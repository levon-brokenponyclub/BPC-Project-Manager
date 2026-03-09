import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useParams } from "react-router-dom";

import {
  addComment,
  createTask,
  deleteTask,
  deleteTaskFile,
  getSignedFileUrl,
  getRunningTimer,
  listComments,
  listTaskFiles,
  listTaskActivity,
  listTasksWithUsers,
  listTimeEntries,
  logTaskActivity,
  notifyWorkspaceEvent,
  startTaskTimer,
  stopTaskTimer,
  uploadTaskFile,
  updateTask,
} from "@/api";
import type { TaskWithUsers } from "@/api/tasks";
import { getMyWorkspaceRole, getWorkspaceUsers } from "@/api/workspaces";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { TaskTable } from "@/components/tasks/TaskTable";
import { TasksSkeleton } from "@/components/skeletons/TasksSkeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataStateWrapper } from "@/components/ui/DataStateWrapper";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { queryKeys } from "@/lib/queryKeys";
import {
  getEffectiveRole,
  getStoredRoleView,
  type RoleViewMode,
} from "@/lib/roleView";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import type { Task, TaskStatus } from "@/types/models";

interface NewTaskInput {
  title: string;
  description: string;
  status: TaskStatus;
  due_date: string | null;
  assignee_user_id: string | null;
}

interface CreateTaskPayload {
  input: NewTaskInput;
  files: File[];
}

const statusFilters: Array<TaskStatus | "All"> = [
  "All",
  "Todo",
  "In Progress",
  "In Review",
  "Complete",
  "Cancelled",
];

export function TasksPage(): React.ReactElement {
  const { workspaceId = "" } = useParams<{ workspaceId: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [status, setStatus] = useState<TaskStatus | "All">("All");
  const [search, setSearch] = useState("");
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskWithUsers | null>(null);
  const [isNewTaskFlow, setIsNewTaskFlow] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [roleViewMode, setRoleViewMode] = useState<RoleViewMode>("admin");

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

  useEffect(() => {
    if (!workspaceId) {
      return;
    }

    setRoleViewMode(getStoredRoleView(workspaceId) ?? "admin");
  }, [workspaceId]);

  const tasksQuery = useQuery({
    queryKey: queryKeys.tasks(workspaceId, status, search),
    queryFn: () => listTasksWithUsers(workspaceId, { status, search }),
    enabled: Boolean(workspaceId),
  });

  const workspaceUsersQuery = useQuery({
    queryKey: ["workspace", workspaceId, "users"],
    queryFn: () => getWorkspaceUsers(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const formatUserDisplayName = (email: string | null | undefined): string => {
    if (!email) {
      return "Unassigned";
    }

    const localPart = email.split("@")[0] ?? "";
    const tokens = localPart
      .split(/[._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((token) => token.charAt(0).toUpperCase() + token.slice(1));

    return tokens.length > 0 ? tokens.join(" ") : email;
  };

  useEffect(() => {
    const validTaskIds = new Set(
      (tasksQuery.data ?? []).map((task) => task.id),
    );
    setSelectedTaskIds((previous) =>
      previous.filter((taskId) => validTaskIds.has(taskId)),
    );
  }, [tasksQuery.data]);

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

  const runningTimerQuery = useQuery({
    queryKey: queryKeys.runningTimer(workspaceId),
    queryFn: () => getRunningTimer(workspaceId),
    enabled: Boolean(workspaceId),
    refetchInterval: 5000,
  });

  const refreshWorkspaceData = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks(workspaceId, status, search),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.timeEntries(workspaceId),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.runningTimer(workspaceId),
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
      queryClient.invalidateQueries({
        queryKey: queryKeys.hoursBreakdown(workspaceId),
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
      setIsNewTaskFlow(false);
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

  const openNewTaskDrawer = (): void => {
    const now = new Date().toISOString();
    setIsNewTaskFlow(true);
    setSelectedTask({
      id: "draft-new-task",
      workspace_id: workspaceId,
      title: "",
      description: "",
      status: "Todo",
      due_date: null,
      assignee_user_id: null,
      created_by: user?.id ?? "",
      created_at: now,
      updated_at: now,
      priority: "Medium",
      estimated_hours: null,
      billable: true,
      client_visible: true,
      blocked: false,
      blocked_reason: null,
      completed_at: null,
      support_bucket_id: null,
      owner: null,
      assignee: null,
    });
  };

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, patch }: { taskId: string; patch: Partial<Task> }) =>
      updateTask(taskId, patch),
    onSuccess: async (task, variables) => {
      setSelectedTask(null);
      await logTaskActivity(task.id, "task_updated", {
        patch: "field updated",
      });

      const patch = variables.patch;
      const previousAssigneeId = selectedTask?.assignee_user_id ?? null;
      const nextAssigneeId =
        patch.assignee_user_id !== undefined
          ? (patch.assignee_user_id ?? null)
          : previousAssigneeId;

      const assigneeChanged =
        patch.assignee_user_id !== undefined &&
        nextAssigneeId !== previousAssigneeId;

      const statusChanged =
        patch.status !== undefined && patch.status !== selectedTask?.status;

      if (assigneeChanged) {
        const assigneeEmail = workspaceUsersQuery.data?.find(
          (workspaceUser) => workspaceUser.user_id === nextAssigneeId,
        )?.email;

        const assigneeName = nextAssigneeId
          ? formatUserDisplayName(assigneeEmail)
          : "Unassigned";

        await notifyWorkspaceEvent(workspaceId, "task.status_changed", {
          taskId: task.id,
          taskTitle: task.title,
          field: "assignee",
          to: assigneeName,
          assignee_name: assigneeName,
        });
      } else if (statusChanged) {
        await notifyWorkspaceEvent(workspaceId, "task.status_changed", {
          taskId: task.id,
          taskTitle: task.title,
          field: "status",
          from: (selectedTask?.status as string | undefined) ?? null,
          to: task.status,
        });
      }

      await refreshWorkspaceData();
      showToast("Task updated successfully.");
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Failed to update task";
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

  const startTimerMutation = useMutation({
    mutationFn: (taskId: string) => startTaskTimer(workspaceId, taskId),
    onSuccess: refreshWorkspaceData,
  });

  const stopTimerMutation = useMutation({
    mutationFn: (taskId: string) => stopTaskTimer(workspaceId, taskId),
    onSuccess: refreshWorkspaceData,
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
    mutationFn: async ({
      fileId,
      taskId,
    }: {
      fileId: string;
      taskId: string;
    }) => {
      await deleteTaskFile(fileId);
      return { taskId };
    },
    onSuccess: async ({ taskId }) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.taskFiles(workspaceId, taskId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.taskActivity(taskId),
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
      return { url, fileName };
    },
    onSuccess: ({ url }) => {
      window.open(url, "_blank", "noopener,noreferrer");
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await deleteTask(taskId);
      return taskId;
    },
    onSuccess: async (taskId) => {
      if (selectedTask?.id === taskId) {
        setSelectedTask(null);
      }

      setSelectedTaskIds((previous) => previous.filter((id) => id !== taskId));
      await refreshWorkspaceData();
    },
  });

  const confirmDeletion = (count: number): boolean => {
    const input = window.prompt(
      `Type DELETE to permanently delete ${count} task${count > 1 ? "s" : ""}.`,
      "",
    );
    return input === "DELETE";
  };

  const handleBulkDelete = async (): Promise<void> => {
    if (selectedTaskIds.length === 0) {
      return;
    }

    if (!confirmDeletion(selectedTaskIds.length)) {
      return;
    }

    setIsBulkDeleting(true);
    try {
      for (const taskId of selectedTaskIds) {
        await deleteTaskMutation.mutateAsync(taskId);
      }

      setSelectedTaskIds([]);
      showToast(
        `${selectedTaskIds.length} task${selectedTaskIds.length > 1 ? "s" : ""} deleted successfully.`,
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete selected tasks";
      showToast(message, "error");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleDeleteTask = async (taskId: string): Promise<void> => {
    if (!confirmDeletion(1)) {
      return;
    }

    try {
      await deleteTaskMutation.mutateAsync(taskId);
      setSelectedTask(null);
      showToast("Task deleted successfully.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete task";
      showToast(message, "error");
    }
  };

  const toggleTaskSelection = (taskId: string): void => {
    setSelectedTaskIds((previous) =>
      previous.includes(taskId)
        ? previous.filter((id) => id !== taskId)
        : [...previous, taskId],
    );
  };

  const toggleAllTaskSelection = (taskIds: string[]): void => {
    setSelectedTaskIds((previous) => {
      const allSelected =
        taskIds.length > 0 &&
        taskIds.every((taskId) => previous.includes(taskId));
      if (allSelected) {
        return previous.filter((taskId) => !taskIds.includes(taskId));
      }

      return Array.from(new Set([...previous, ...taskIds]));
    });
  };

  const tasks = tasksQuery.data ?? [];
  const tasksIsLoading = tasksQuery.isLoading;
  const tasksIsError = tasksQuery.isError;
  const tasksIsEmpty = !tasksIsLoading && tasks.length === 0;

  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-center justify-between gap-4 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {statusFilters.map((value) => (
            <Button
              key={value}
              variant={status === value ? "default" : "secondary"}
              size="sm"
              onClick={() => setStatus(value)}
            >
              {value}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Input
            placeholder="Search tasks"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-[200px]"
          />
          {canManageTasks ? (
            <Button
              onClick={openNewTaskDrawer}
              disabled={createTaskMutation.isPending}
            >
              <Plus className="mr-1 h-4 w-4" />
              New Task
            </Button>
          ) : null}
          {canManageTasks && selectedTaskIds.length > 0 ? (
            <Button
              variant="secondary"
              onClick={() => void handleBulkDelete()}
              disabled={
                selectedTaskIds.length === 0 ||
                deleteTaskMutation.isPending ||
                isBulkDeleting
              }
            >
              {isBulkDeleting
                ? "Deleting..."
                : `Delete (${selectedTaskIds.length})`}
            </Button>
          ) : null}
        </div>
      </Card>

      <DataStateWrapper
        isLoading={tasksIsLoading}
        isError={tasksIsError}
        error={tasksQuery.error}
        onRetry={() => {
          void tasksQuery.refetch();
        }}
        isEmpty={tasksIsEmpty}
        skeleton={<TasksSkeleton />}
        empty={
          <EmptyState
            title="No tasks found"
            description="Create your first task to get work moving."
          />
        }
      >
        <TaskTable
          tasks={tasks}
          onOpen={setSelectedTask}
          selectedTaskIds={selectedTaskIds}
          onToggleTaskSelection={toggleTaskSelection}
          onToggleAllSelection={toggleAllTaskSelection}
          runningTaskId={runningTimerQuery.data?.entry.task_id}
          onStartTimer={(taskId) => startTimerMutation.mutate(taskId)}
          onStopTimer={(taskId) => stopTimerMutation.mutate(taskId)}
          showTimerControls={effectiveRole === "admin"}
        />
      </DataStateWrapper>

      <TaskDrawer
        open={Boolean(selectedTask)}
        task={selectedTask}
        isNewTask={isNewTaskFlow}
        isCreatingTask={createTaskMutation.isPending}
        isSavingTask={updateTaskMutation.isPending}
        workspaceId={workspaceId}
        currentUserId={user?.id ?? null}
        effectiveRole={effectiveRole}
        canManageTasks={canManageTasks}
        isDeletingTask={deleteTaskMutation.isPending}
        onClose={() => {
          setSelectedTask(null);
          setIsNewTaskFlow(false);
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
