import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useParams } from "react-router-dom";

import {
  addComment,
  createTask,
  getRunningTimer,
  listComments,
  listTaskActivity,
  listTasks,
  listTimeEntries,
  logTaskActivity,
  notifyWorkspaceEvent,
  startTaskTimer,
  stopTaskTimer,
  updateTask,
} from "@/api";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { TaskTable } from "@/components/tasks/TaskTable";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { queryKeys } from "@/lib/queryKeys";
import type { Task, TaskStatus } from "@/types/models";

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

  const [status, setStatus] = useState<TaskStatus | "All">("All");
  const [search, setSearch] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

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
    mutationFn: () =>
      createTask(workspaceId, {
        title: "New task",
        description: "",
        due_date: null,
        assignee_user_id: null,
        status: "Todo",
      }),
    onSuccess: async (task) => {
      await logTaskActivity(task.id, "task_created", { title: task.title });
      await notifyWorkspaceEvent(workspaceId, "task_created", {
        taskId: task.id,
        title: task.title,
      });
      await refreshWorkspaceData();
    },
  });

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
          <Button onClick={() => createTaskMutation.mutate()}>
            <Plus className="mr-1 h-4 w-4" /> New Task
          </Button>
        </div>
      </Card>

      <TaskTable
        tasks={tasksQuery.data ?? []}
        onOpen={setSelectedTask}
        runningTaskId={runningTimerQuery.data?.entry.task_id}
        onStartTimer={(taskId) => startTimerMutation.mutate(taskId)}
        onStopTimer={(taskId) => stopTimerMutation.mutate(taskId)}
      />

      <TaskDrawer
        open={Boolean(selectedTask)}
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onSaveTask={(taskId, patch) =>
          updateTaskMutation.mutate({ taskId, patch })
        }
        comments={commentsQuery.data ?? []}
        activity={activityQuery.data ?? []}
        timeEntries={entriesQuery.data ?? []}
        onAddComment={(body) => {
          if (!selectedTask) {
            return;
          }
          commentMutation.mutate({ taskId: selectedTask.id, body });
        }}
      />
    </div>
  );
}
