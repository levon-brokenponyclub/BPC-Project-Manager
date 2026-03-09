import { Badge } from "@/components/ui/badge";
import type { TaskStatus } from "@/types/models";

const statusClassMap: Record<TaskStatus, string> = {
  Todo: "bg-status-todo text-foreground whitespace-nowrap",
  "In Progress": "bg-status-inprogress text-foreground whitespace-nowrap",
  "In Review": "bg-status-inreview text-foreground whitespace-nowrap",
  Complete: "bg-status-complete text-foreground whitespace-nowrap",
  Cancelled: "bg-status-canceled text-foreground whitespace-nowrap",
};

export function StatusPill({
  status,
}: {
  status: TaskStatus;
}): React.ReactElement {
  return <Badge className={statusClassMap[status]}>{status}</Badge>;
}
