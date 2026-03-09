import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useParams } from "react-router-dom";

import {
  addComment,
  createTask,
  deleteTaskFile,
  getSignedFileUrl,
  getRunningTimer,
  listComments,
  listTaskFiles,
  listTaskActivity,
  listTasks,
  listTimeEntries,
  logTaskActivity,
  notifyWorkspaceEvent,
  startTaskTimer,
  stopTaskTimer,
  uploadTaskFile,
  updateTask,
} from "@/api";
import { getMyWorkspaceRole } from "@/api/workspaces";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { TaskTable } from "@/components/tasks/TaskTable";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { queryKeys } from "@/lib/queryKeys";
import {
  getEffectiveRole,
  getStoredRoleView,
  type RoleViewMode,
} from "@/lib/roleView";
import { useAuth } from "@/providers/AuthProvider";
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
];

export function TasksPage(): React.ReactElement {
  const { workspaceId = "" } = useParams<{ workspaceId: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [status, setStatus] = useState<TaskStatus | "All">("All");
  const [search, setSearch] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isNewTaskFlow, setIsNewTaskFlow] = useState(false);
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

  useEffect(() => {
    if (!workspaceId) {
      return;
    }

    setRoleViewMode(getStoredRoleView(workspaceId) ?? "admin");
  }, [workspaceId]);

  const tasksQuery = useQuery({
    queryKey: queryKeys.tasks(workspaceId, status, search),
    queryFn: () => listTasks(workspaceId, { status, search }),
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
      setSelectedTask(task);
      await logTaskActivity(task.id, "task_created", { title: task.title });
      await notifyWorkspaceEvent(workspaceId, "task_created", {
        taskId: task.id,
        title: task.title,
      });
      await refreshWorkspaceData();
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
    });
  };

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, patch }: { taskId: string; patch: Partial<Task> }) =>
      updateTask(taskId, patch),
    onSuccess: async (task) => {
      setSelectedTask(task);
      await logTaskActivity(task.id, "task_updated", {
        patch: "field updated",
      });
      await notifyWorkspaceEvent(workspaceId, "status_change", {
        taskId: task.id,
        status: task.status,
      });
      await refreshWorkspaceData();
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

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
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

        <div className="flex items-center gap-2">
          <Input
            placeholder="Search tasks"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {effectiveRole === "admin" ? (
            <Button
              onClick={openNewTaskDrawer}
              disabled={createTaskMutation.isPending}
            >
              <Plus className="mr-1 h-4 w-4" />
              New Task
            </Button>
          ) : null}
        </div>
      </Card>

      <TaskTable
        tasks={tasksQuery.data ?? []}
        onOpen={setSelectedTask}
        runningTaskId={runningTimerQuery.data?.entry.task_id}
        onStartTimer={(taskId) => startTimerMutation.mutate(taskId)}
        onStopTimer={(taskId) => stopTimerMutation.mutate(taskId)}
        showTimerControls={effectiveRole === "admin"}
      />

      <TaskDrawer
        open={Boolean(selectedTask)}
        task={selectedTask}
        isNewTask={isNewTaskFlow}
        isCreatingTask={createTaskMutation.isPending}
        workspaceId={workspaceId}
        currentUserId={user?.id ?? null}
        effectiveRole={effectiveRole}
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
