import { Badge } from "@/components/ui/badge";
import type { TaskStatus } from "@/types/models";

const statusClassMap: Record<TaskStatus, string> = {
  Todo: "bg-status-todo text-foreground",
  "In Progress": "bg-status-inprogress text-foreground",
  "In Review": "bg-status-inreview text-foreground",
  Complete: "bg-status-complete text-foreground",
};

export function StatusPill({
  status,
}: {
  status: TaskStatus;
}): React.ReactElement {
  return <Badge className={statusClassMap[status]}>{status}</Badge>;
}
