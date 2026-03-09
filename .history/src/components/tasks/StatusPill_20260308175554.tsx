import { Badge } from "@/components/ui/badge";
import type { TaskStatus } from "@/types/models";

const statusClassMap: Record<TaskStatus, string> = {
  Todo: "bg-status-todo text-foreground whitespace-nowrap",
  Upcoming: "bg-status-upcoming text-white whitespace-nowrap",
  "In Progress": "bg-status-inprogress text-white whitespace-nowrap",
  "In Review": "bg-status-inreview text-white whitespace-nowrap",
  "Awaiting Client": "bg-status-awaiting-client text-white whitespace-nowrap",
  "On Hold": "bg-status-on-hold text-white whitespace-nowrap",
  Complete: "bg-status-complete text-white whitespace-nowrap",
  Cancelled: "bg-status-canceled text-white whitespace-nowrap",
};

export function StatusPill({
  status,
}: {
  status: TaskStatus;
}): React.ReactElement {
  return <Badge className={statusClassMap[status]}>{status}</Badge>;
}
