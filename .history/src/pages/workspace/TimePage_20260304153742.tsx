import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Square } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";

import {
  getRunningTimer,
  listTasks,
  listTimeEntries,
  startTaskTimer,
  stopTaskTimer,
} from "@/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { queryKeys } from "@/lib/queryKeys";
import { secondsToHms } from "@/lib/utils";

export function TimePage(): React.ReactElement {
  const { workspaceId = "" } = useParams<{ workspaceId: string }>();
  const queryClient = useQueryClient();
  const [selectedTaskId, setSelectedTaskId] = useState("");

  const tasksQuery = useQuery({
    queryKey: queryKeys.tasks(workspaceId, "All", ""),
    queryFn: () => listTasks(workspaceId, { status: "All" }),
    enabled: Boolean(workspaceId),
  });

  const entriesQuery = useQuery({
    queryKey: queryKeys.timeEntries(workspaceId),
    queryFn: () => listTimeEntries(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const runningQuery = useQuery({
    queryKey: queryKeys.runningTimer(workspaceId),
    queryFn: () => getRunningTimer(workspaceId),
    enabled: Boolean(workspaceId),
    refetchInterval: 5000,
  });

  const refresh = async (): Promise<void> => {
    await Promise.all([
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
        queryKey: queryKeys.hoursBreakdown(workspaceId),
      }),
    ]);
  };

  const startMutation = useMutation({
    mutationFn: () => startTaskTimer(workspaceId, selectedTaskId),
    onSuccess: refresh,
  });

  const stopMutation = useMutation({
    mutationFn: () =>
      stopTaskTimer(
        workspaceId,
        runningQuery.data?.entry.task_id ?? selectedTaskId,
      ),
    onSuccess: refresh,
  });

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h1 className="text-xl font-semibold text-foreground">Time Tracking</h1>
        <p className="mt-1 text-sm text-muted">
          Track support work against prepaid hours.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <select
            className="h-10 min-w-[260px] rounded-xl border border-border bg-white px-3 text-sm"
            value={selectedTaskId}
            onChange={(event) => setSelectedTaskId(event.target.value)}
          >
            <option value="">Select task</option>
            {(tasksQuery.data ?? []).map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>

          <Button
            onClick={() => startMutation.mutate()}
            disabled={!selectedTaskId}
          >
            <Play className="mr-1 h-4 w-4" /> Start timer
          </Button>
          <Button variant="secondary" onClick={() => stopMutation.mutate()}>
            <Square className="mr-1 h-4 w-4" /> Stop timer
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-lg font-semibold text-foreground">Time Entries</h2>
        <div className="mt-3 space-y-2 text-sm">
          {(entriesQuery.data ?? []).map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2"
            >
              <p className="text-foreground">
                Task {entry.task_id.slice(0, 8)}...
              </p>
              <p className="text-muted">
                {secondsToHms(Number(entry.duration_seconds ?? 0))}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
