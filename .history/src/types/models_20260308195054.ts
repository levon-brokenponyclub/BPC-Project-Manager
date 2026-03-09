export type TaskStatus =
  | "Todo"
  | "Upcoming"
  | "In Progress"
  | "In Review"
  | "Awaiting Client"
  | "On Hold"
  | "Complete"
  | "Cancelled";
export type TaskPriority = "Low" | "Medium" | "High" | "Urgent";

export interface Workspace {
  id: string;
  name: string;
}

export interface Task {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority?: TaskPriority;
  support_bucket_id?: string | null;
  estimated_hours?: number | null;
  billable?: boolean;
  client_visible?: boolean;
  blocked?: boolean;
  blocked_reason?: string | null;
  completed_at?: string | null;
  due_date: string | null;
  assignee_user_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  parent_task_id: string | null;
}

export interface TaskFile {
  id: string;
  workspace_id: string;
  task_id: string;
  uploader_user_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

export interface TaskActivity {
  id: string;
  task_id: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface TimeEntry {
  id: string;
  workspace_id: string;
  task_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  created_at: string;
}

export interface SupportSummary {
  workspace_id: string;
  hours_allocated: number;
  hours_used: number;
  hours_remaining: number;
}

export interface Notification {
  id: string;
  workspace_id: string;
  user_id: string;
  type: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}
