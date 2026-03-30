export type TaskStatus =
  | "Todo"
  | "Upcoming"
  | "In Progress"
  | "In Review"
  | "Awaiting Client"
  | "On Hold"
  | "Complete"
  | "Cancelled"

export type TaskPriority = "Normal" | "Medium" | "High" | "Urgent"

export interface TaskRow {
  id: string
  workspace_id: string
  title: string
  status: TaskStatus
  priority: TaskPriority | null
  due_date: string | null
  assignee_user_id: string | null
  created_by: string
  created_at: string
  updated_at: string
  parent_task_id: string | null
  description: string | null
  estimated_hours: number | null
  billable: boolean
  client_visible: boolean
  blocked: boolean
  blocked_reason: string | null
  // enriched by loader
  assignee_email: string | null
  subRows?: TaskRow[]
}
