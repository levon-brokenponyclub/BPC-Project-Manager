import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useSearchParams } from "react-router-dom";

import {
  addComment,
  createTask,
  deleteTask,
  deleteTaskFile,
  getSignedFileUrl,
  listComments,
  listTaskFiles,
  listTaskActivity,
  listTasksWithUsers,
  listTimeEntries,
  logTaskActivity,
  notifyWorkspaceEvent,
  uploadTaskFile,
  updateTask,
} from "@/api";
import type { TaskWithUsers } from "@/api/tasks";
import { getMyWorkspaceRole, getWorkspaceUsers } from "@/api/workspaces";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { NewTaskModal } from "@/components/tasks/NewTaskModal";
import { TaskTable } from "@/components/tasks/TaskTable";
import { TasksSkeleton } from "@/components/skeletons/TasksSkeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataStateWrapper } from "@/components/ui/DataStateWrapper";
import { EmptyState } from "@/components/ui/EmptyState";
import { queryKeys } from "@/lib/queryKeys";
import {
  getEffectiveRole,
  getStoredRoleView,
  type RoleViewMode,
} from "@/lib/roleView";
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

export function TasksPage(): React.ReactElement {
  const { workspaceId = "" } = useParams<{ workspaceId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [selectedTask, setSelectedTask] = useState<TaskWithUsers | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [roleViewMode, setRoleViewMode] = useState<RoleViewMode>("admin");
  const [filterOpen, setFilterOpen] = useState(false);
  const [displayOpen, setDisplayOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);
  const filterPanelRef = useRef<HTMLDivElement | null>(null);
  const displayButtonRef = useRef<HTMLButtonElement | null>(null);
  const displayPanelRef = useRef<HTMLDivElement | null>(null);

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
    queryKey: queryKeys.tasks(workspaceId, "All", ""),
    queryFn: () => listTasksWithUsers(workspaceId, { status: "All" }),
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
      setIsNewTaskModalOpen(false);
      setSelectedTask(null);
      await logTaskActivity(task.id, "task_created", { title: task.title });
      await notifyWorkspaceEvent(workspaceId, "task.created", {
        taskId: task.id,
        taskTitle: task.title,
      });
      await refreshWorkspaceData();
      showToast(`Created task \"${taskToastLabel(task.title)}\".`);
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

  const taskToastLabel = (title?: string | null): string => {
    const normalized = title?.trim();
    return normalized && normalized.length > 0 ? normalized : "Untitled task";
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
      showToast(`Updated task \"${taskToastLabel(task.title)}\".`);
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

      if (selectedTask?.id === taskId) {
        setSelectedTask(null);
      }
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

  const handleDeleteTask = async (taskId: string): Promise<void> => {
    if (!confirmDeletion(1)) {
      return;
    }

    const taskTitle =
      selectedTask?.id === taskId
        ? selectedTask.title
        : ((tasksQuery.data ?? []).find((task) => task.id === taskId)?.title ??
          "Untitled task");

    try {
      await deleteTaskMutation.mutateAsync({ taskId, taskTitle });
      setSelectedTask(null);
      showToast(`Deleted task \"${taskToastLabel(taskTitle)}\".`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete task";
      showToast(message, "error");
    }
  };

  const tasks = tasksQuery.data ?? [];
  const tasksIsLoading = tasksQuery.isLoading;
  const tasksIsError = tasksQuery.isError;
  const tasksIsEmpty = !tasksIsLoading && tasks.length === 0;
  const requestedTaskId = searchParams.get("taskId");

  const clearTaskIdParam = (): void => {
    if (!searchParams.has("taskId")) {
      return;
    }

    const next = new URLSearchParams(searchParams);
    next.delete("taskId");
    setSearchParams(next, { replace: true });
  };

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

  useEffect(() => {
    if (!requestedTaskId) {
      return;
    }

    const matchedTask = tasks.find((task) => task.id === requestedTaskId);
    if (!matchedTask) {
      return;
    }

    setSelectedTask(matchedTask);
  }, [requestedTaskId, tasks]);

  return (
    <div className="relative space-y-6">
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
        <Card className="relative overflow-visible border-[#222330] bg-[#191A22]">
          <div className="flex h-10 items-center justify-between border-b border-[#222330] bg-[#12151cb3] px-6 py-2">
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
                <Button
                  type="button"
                  onClick={openNewTaskModal}
                  disabled={createTaskMutation.isPending}
                  className="h-[23px] min-w-[85px] rounded-[5px] border border-[#6C77E5] bg-[#5E69D1] px-2 text-[12px] font-medium leading-[15px] text-[#FEFEFF] shadow-[0px_4px_4px_-1px_rgba(0,0,0,0.05),0px_1px_1px_rgba(0,0,0,0.1)] hover:bg-[#6A76EB]"
                >
                  New Task
                </Button>
              ) : null}
            </div>
          </div>

          <TaskTable tasks={tasks} onOpen={setSelectedTask} />
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
          clearTaskIdParam();
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
