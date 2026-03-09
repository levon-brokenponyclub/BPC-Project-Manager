import { Badge } from '@/components/ui/badge'
import type { TaskStatus } from '@/types/models'

const statusClassMap: Record<TaskStatus, string> = {
  Todo: 'bg-status-todo',
  'In Progress': 'bg-status-inprogress',
  'In Review': 'bg-status-inreview',
  Complete: 'bg-status-complete',
}

export function StatusPill({ status }: { status: TaskStatus }): React.ReactElement {
  return <Badge className={statusClassMap[status]}>{status}</Badge>
}