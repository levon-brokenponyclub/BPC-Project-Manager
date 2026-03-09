import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";

import {
  addComment,
  createTask,
  deleteTask,
  deleteTaskFile,
  getSignedFileUrl,
  listComments,
  listTaskFiles,
  listTaskActivity,
  listTasksWithSubtasks,
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
  const [newTaskParentId, setNewTaskParentId] = useState<string | null>(null);
  const [newTaskParentTitle, setNewTaskParentTitle] = useState<string | null>(
    null,
  );
  const [roleViewMode, setRoleViewMode] = useState<RoleViewMode>("admin");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);
  const filterPanelRef = useRef<HTMLDivElement | null>(null);
  const sortButtonRef = useRef<HTMLButtonElement | null>(null);
  const sortPanelRef = useRef<HTMLDivElement | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "All">("All");
  const [assigneeFilter, setAssigneeFilter] = useState<string | "All">("All");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "All">(
    "All",
  );

  // Sort state
  type SortField = "status" | "assignee" | "due_date" | "priority" | "none";
  type SortOrder = "asc" | "desc";
  const [sortBy, setSortBy] = useState<SortField>("due_date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

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
    queryFn: () => listTasksWithSubtasks(workspaceId, { status: "All" }),
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
    setNewTaskParentId(null);
    setNewTaskParentTitle(null);
    setIsNewTaskModalOpen(true);
  };

  const openAddSubtask = (parentTaskId: string): void => {
    const parent = (tasksQuery.data ?? []).find((t) => t.id === parentTaskId);
    setNewTaskParentId(parentTaskId);
    setNewTaskParentTitle(parent?.title ?? null);
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

  const allTasks = tasksQuery.data ?? [];

  // Filter tasks based on active filters
  const filteredTasks = allTasks.filter((task) => {
    if (statusFilter !== "All" && task.status !== statusFilter) {
      return false;
    }
    if (assigneeFilter !== "All" && task.assignee_user_id !== assigneeFilter) {
      return false;
    }
    if (priorityFilter !== "All" && task.priority !== priorityFilter) {
      return false;
    }
    return true;
  });

  const compareTasks = (a: TaskWithUsers, b: TaskWithUsers): number => {
    if (sortBy === "none") return 0;

    let comparison = 0;

    if (sortBy === "status") {
      const statusOrder = {
        Todo: 0,
        Upcoming: 1,
        "In Progress": 2,
        "In Review": 3,
        "Awaiting Client": 4,
        "On Hold": 5,
        Complete: 6,
        Cancelled: 7,
      };
      comparison =
        (statusOrder[a.status as keyof typeof statusOrder] ?? 99) -
        (statusOrder[b.status as keyof typeof statusOrder] ?? 99);
    } else if (sortBy === "assignee") {
      const aEmail = a.assignee?.email ?? "";
      const bEmail = b.assignee?.email ?? "";
      comparison = aEmail.localeCompare(bEmail);
    } else if (sortBy === "due_date") {
      const aDate = a.due_date
        ? new Date(a.due_date).getTime()
        : Number.MAX_SAFE_INTEGER;
      const bDate = b.due_date
        ? new Date(b.due_date).getTime()
        : Number.MAX_SAFE_INTEGER;
      comparison = aDate - bDate;
    } else if (sortBy === "priority") {
      const priorityOrder = { Low: 0, Medium: 1, High: 2, Urgent: 3 };
      const aPriority = a.priority ?? "Low";
      const bPriority = b.priority ?? "Low";
      comparison =
        (priorityOrder[aPriority as keyof typeof priorityOrder] ?? 0) -
        (priorityOrder[bPriority as keyof typeof priorityOrder] ?? 0);
    }

    return sortOrder === "asc" ? comparison : -comparison;
  };

  // Sort tasks and subtasks based on active sort
  const tasks = [...filteredTasks]
    .map((task) => ({
      ...task,
      subtasks: [...(task.subtasks ?? [])].sort(compareTasks),
    }))
    .sort(compareTasks);

  const tasksIsLoading = tasksQuery.isLoading;
  const tasksIsError = tasksQuery.isError;
  const tasksIsEmpty = !tasksIsLoading && tasks.length === 0;

  // Check if any filters are active
  const hasActiveFilters =
    statusFilter !== "All" ||
    assigneeFilter !== "All" ||
    priorityFilter !== "All";

  // Clear all filters
  const clearAllFilters = (): void => {
    setStatusFilter("All");
    setAssigneeFilter("All");
    setPriorityFilter("All");
  };
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
    <div className="relative min-h-full space-y-6">
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
            action={
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={openNewTaskModal}
              >
                <Plus className="h-4 w-4" />
                Create Task
              </Button>
            }
          />
        }
      >
        <Card className="relative overflow-visible border-[#222330] bg-[#191A22]">
          <div className="flex h-13 items-center justify-between border-b border-[#222330] px-6 py-2">
            <div className="relative">
              <button
                ref={filterButtonRef}
                type="button"
                aria-label="Open filters"
                onClick={() => {
                  setFilterOpen((previous) => !previous);
                  setSortOpen(false);
                }}
                className={`focus-ring inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium transition-colors hover:bg-card/20 ${
                  hasActiveFilters ? "text-primary" : "text-foreground"
                }`}
              >
                <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
                  <path
                    d="M2.5 3.5h11M4.5 7.5h7M6.5 11.5h3"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
                <span>Filter</span>
                {hasActiveFilters ? (
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-white">
                    {
                      [
                        statusFilter !== "All",
                        assigneeFilter !== "All",
                        priorityFilter !== "All",
                      ].filter(Boolean).length
                    }
                  </span>
                ) : null}
              </button>

              {filterOpen ? (
                <div
                  ref={filterPanelRef}
                  className="absolute left-0 top-full z-50 mt-2 min-w-[280px] rounded-[8px] border border-[#333541] bg-[#1B1C23] p-[0.5px] shadow-[0px_3px_8px_rgba(0,0,0,0.12),0px_2px_5px_rgba(0,0,0,0.12),0px_1px_1px_rgba(0,0,0,0.12)]"
                >
                  <div className="flex flex-col py-1">
                    {/* Status Filter */}
                    <div className="mb-3">
                      <div className="mb-1 px-[14px] text-[11px] font-medium uppercase tracking-wide text-[#9A9BA2]">
                        Status
                      </div>
                      <div className="space-y-1">
                        {(
                          [
                            "All",
                            "Todo",
                            "Upcoming",
                            "In Progress",
                            "In Review",
                            "Awaiting Client",
                            "On Hold",
                            "Complete",
                            "Cancelled",
                          ] as const
                        ).map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => {
                              setStatusFilter(status);
                              setFilterOpen(false);
                            }}
                            className={`focus-ring mx-1.5 block h-8 w-[calc(100%-12px)] rounded-[6px] px-[14px] text-left text-[13px] leading-4 transition-colors hover:bg-[#2B2C34] ${
                              statusFilter === status
                                ? "bg-[#2B2C34] text-white"
                                : "text-[#E4E4EC]"
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Assignee Filter */}
                    <div className="mb-3 mt-1 border-t border-[#2E2F3B] pt-2">
                      <div className="mb-1 px-[14px] text-[11px] font-medium uppercase tracking-wide text-[#9A9BA2]">
                        Assignee
                      </div>
                      <div className="max-h-[200px] space-y-1 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setAssigneeFilter("All");
                            setFilterOpen(false);
                          }}
                          className={`focus-ring mx-1.5 block h-8 w-[calc(100%-12px)] rounded-[6px] px-[14px] text-left text-[13px] leading-4 transition-colors hover:bg-[#2B2C34] ${
                            assigneeFilter === "All"
                              ? "bg-[#2B2C34] text-white"
                              : "text-[#E4E4EC]"
                          }`}
                        >
                          All
                        </button>
                        {workspaceUsersQuery.data?.map((user) => (
                          <button
                            key={user.user_id}
                            type="button"
                            onClick={() => {
                              setAssigneeFilter(user.user_id);
                              setFilterOpen(false);
                            }}
                            className={`focus-ring mx-1.5 block h-8 w-[calc(100%-12px)] rounded-[6px] px-[14px] text-left text-[13px] leading-4 transition-colors hover:bg-[#2B2C34] ${
                              assigneeFilter === user.user_id
                                ? "bg-[#2B2C34] text-white"
                                : "text-[#E4E4EC]"
                            }`}
                          >
                            {formatUserDisplayName(user.email)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Priority Filter */}
                    <div className="mb-3 mt-1 border-t border-[#2E2F3B] pt-2">
                      <div className="mb-1 px-[14px] text-[11px] font-medium uppercase tracking-wide text-[#9A9BA2]">
                        Priority
                      </div>
                      <div className="space-y-1">
                        {(
                          ["All", "Low", "Medium", "High", "Urgent"] as const
                        ).map((priority) => (
                          <button
                            key={priority}
                            type="button"
                            onClick={() => {
                              setPriorityFilter(priority);
                              setFilterOpen(false);
                            }}
                            className={`focus-ring mx-1.5 block h-8 w-[calc(100%-12px)] rounded-[6px] px-[14px] text-left text-[13px] leading-4 transition-colors hover:bg-[#2B2C34] ${
                              priorityFilter === priority
                                ? "bg-[#2B2C34] text-white"
                                : "text-[#E4E4EC]"
                            }`}
                          >
                            {priority}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Clear Filters */}
                    {hasActiveFilters ? (
                      <div className="mt-1 border-t border-[#2E2F3B] pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            clearAllFilters();
                            setFilterOpen(false);
                          }}
                          className="focus-ring mx-1.5 block h-8 w-[calc(100%-12px)] rounded-[6px] px-[14px] text-left text-[13px] leading-4 text-[#E4E4EC] transition-colors hover:bg-[#2B2C34]"
                        >
                          Clear all filters
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  ref={sortButtonRef}
                  type="button"
                  aria-label="Open sort options"
                  onClick={() => {
                    setSortOpen((previous) => !previous);
                    setFilterOpen(false);
                  }}
                  className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-sm border border-[#313339] bg-[#15161D] px-3 text-[13px] font-medium text-white transition-colors hover:bg-[#1C1E26] active:bg-[#20222B] disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-50"
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
                  <span>Sort</span>
                  {sortBy !== "none" ? (
                    <span className="inline-flex h-5 w-5 items-center justify-center">
                      <svg
                        viewBox="0 0 16 16"
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      >
                        {sortOrder === "asc" ? (
                          <path d="M8 4L12 10H4L8 4Z" fill="currentColor" />
                        ) : (
                          <path d="M8 12L12 6H4L8 12Z" fill="currentColor" />
                        )}
                      </svg>
                    </span>
                  ) : null}
                </button>

                {sortOpen ? (
                  <div
                    ref={sortPanelRef}
                    className="absolute right-0 top-full z-50 mt-2 min-w-[220px] rounded-[8px] border border-[#333541] bg-[#1B1C23] p-[0.5px] shadow-[0px_3px_8px_rgba(0,0,0,0.12),0px_2px_5px_rgba(0,0,0,0.12),0px_1px_1px_rgba(0,0,0,0.12)]"
                  >
                    <div className="flex flex-col py-1">
                      <div className="mb-1 px-[14px] text-[11px] font-medium uppercase tracking-wide text-[#9A9BA2]">
                        Sort by
                      </div>
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSortBy("status");
                            setSortOrder(
                              sortBy === "status" && sortOrder === "asc"
                                ? "desc"
                                : "asc",
                            );
                            setSortOpen(false);
                          }}
                          className={`focus-ring mx-1.5 inline-flex h-8 w-[calc(100%-12px)] items-center justify-between rounded-[6px] px-[14px] text-[13px] leading-4 transition-colors hover:bg-[#2B2C34] ${
                            sortBy === "status"
                              ? "bg-[#2B2C34] text-white"
                              : "text-[#E4E4EC]"
                          }`}
                        >
                          <span>Status</span>
                          {sortBy === "status" ? (
                            <span className="text-[11px] leading-[13px] text-[#9A9BA2]">
                              {sortOrder === "asc" ? "↑" : "↓"}
                            </span>
                          ) : null}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSortBy("assignee");
                            setSortOrder(
                              sortBy === "assignee" && sortOrder === "asc"
                                ? "desc"
                                : "asc",
                            );
                            setSortOpen(false);
                          }}
                          className={`focus-ring mx-1.5 inline-flex h-8 w-[calc(100%-12px)] items-center justify-between rounded-[6px] px-[14px] text-[13px] leading-4 transition-colors hover:bg-[#2B2C34] ${
                            sortBy === "assignee"
                              ? "bg-[#2B2C34] text-white"
                              : "text-[#E4E4EC]"
                          }`}
                        >
                          <span>Assignee</span>
                          {sortBy === "assignee" ? (
                            <span className="text-[11px] leading-[13px] text-[#9A9BA2]">
                              {sortOrder === "asc" ? "↑" : "↓"}
                            </span>
                          ) : null}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSortBy("due_date");
                            setSortOrder(
                              sortBy === "due_date" && sortOrder === "asc"
                                ? "desc"
                                : "asc",
                            );
                            setSortOpen(false);
                          }}
                          className={`focus-ring mx-1.5 inline-flex h-8 w-[calc(100%-12px)] items-center justify-between rounded-[6px] px-[14px] text-[13px] leading-4 transition-colors hover:bg-[#2B2C34] ${
                            sortBy === "due_date"
                              ? "bg-[#2B2C34] text-white"
                              : "text-[#E4E4EC]"
                          }`}
                        >
                          <span>Due Date</span>
                          {sortBy === "due_date" ? (
                            <span className="text-[11px] leading-[13px] text-[#9A9BA2]">
                              {sortOrder === "asc" ? "↑" : "↓"}
                            </span>
                          ) : null}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSortBy("priority");
                            setSortOrder(
                              sortBy === "priority" && sortOrder === "asc"
                                ? "desc"
                                : "asc",
                            );
                            setSortOpen(false);
                          }}
                          className={`focus-ring mx-1.5 inline-flex h-8 w-[calc(100%-12px)] items-center justify-between rounded-[6px] px-[14px] text-[13px] leading-4 transition-colors hover:bg-[#2B2C34] ${
                            sortBy === "priority"
                              ? "bg-[#2B2C34] text-white"
                              : "text-[#E4E4EC]"
                          }`}
                        >
                          <span>Priority</span>
                          {sortBy === "priority" ? (
                            <span className="text-[11px] leading-[13px] text-[#9A9BA2]">
                              {sortOrder === "asc" ? "↑" : "↓"}
                            </span>
                          ) : null}
                        </button>
                      </div>
                      {sortBy !== "none" ? (
                        <div className="mt-1 border-t border-[#2E2F3B] pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSortBy("none");
                              setSortOpen(false);
                            }}
                            className="focus-ring mx-1.5 block h-8 w-[calc(100%-12px)] rounded-[6px] px-[14px] text-left text-[13px] leading-4 text-[#E4E4EC] transition-colors hover:bg-[#2B2C34]"
                          >
                            Clear sort
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>

              {canManageTasks ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={openNewTaskModal}
                  disabled={createTaskMutation.isPending}
                  className="min-w-[85px]"
                >
                  <Plus className="h-4 w-4" />
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
        parentTaskId={newTaskParentId}
        parentTaskTitle={newTaskParentTitle}
        onClose={() => {
          setIsNewTaskModalOpen(false);
          setNewTaskParentId(null);
          setNewTaskParentTitle(null);
        }}
        onCreateTask={async (input, files) => {
          await createTaskMutation.mutateAsync({ input, files });
          if (input.parent_task_id) {
            await queryClient.invalidateQueries({
              queryKey: ["task", input.parent_task_id, "subtasks"],
            });
          }
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
        onAddSubtask={(parentTaskId) => {
          openAddSubtask(parentTaskId);
          setSelectedTask(null);
        }}
        onOpenSubtask={(subtask) => setSelectedTask(subtask)}
      />
    </div>
  );
}
