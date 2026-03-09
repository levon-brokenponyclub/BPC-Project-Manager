import { useMemo } from "react";
import { Clock3 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { secondsToHms } from "@/lib/utils";
import type { RunningTimer } from "@/api/time";

interface TimerWidgetProps {
  runningTimer: RunningTimer | null;
  nowTick: number;
}

export function TimerWidget({
  runningTimer,
  nowTick,
}: TimerWidgetProps): React.ReactElement {
  const elapsed = useMemo(() => {
    if (!runningTimer) {
      return "00:00:00";
    }
    const startedAt = new Date(runningTimer.entry.started_at).getTime();
    const seconds = Math.max(0, Math.round((nowTick - startedAt) / 1000));
    return secondsToHms(seconds);
  }, [nowTick, runningTimer]);

  if (!runningTimer) {
    return (
      <Card className="flex items-center gap-2 px-3 py-2 text-xs text-muted">
        <Clock3 className="h-4 w-4" />
        No running timer
      </Card>
    );
  }

  return (
    <Card className="flex items-center gap-3 px-3 py-2">
      <Clock3 className="h-4 w-4 text-primary" />
      <div>
        <p className="text-xs text-muted">{runningTimer.taskTitle}</p>
        <p className="tabular font-mono text-sm font-semibold text-foreground">{elapsed}</p>
      </div>
    </Card>
  );
}
