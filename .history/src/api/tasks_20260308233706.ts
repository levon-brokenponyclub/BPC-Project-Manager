import { supabase } from "@/lib/supabase";
import type { Comment, Task, TaskActivity, TaskStatus } from "@/types/models";

export interface TaskFilters {
  status?: TaskStatus | "All";
  search?: string;
}

export interface UserBasic {
  id: string;
  email: string | null;
  avatar_url?: string | null;
}

export interface TaskWithUsers extends Task {
  owner?: UserBasic | null;
  assignee?: UserBasic | null;
  /** Populated when fetching tasks with their subtasks */
  subtasks?: TaskWithUsers[];
  /** Number of files attached directly to this task */
  file_count?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Build a user map from workspace RPC result for quick lookups */
async function fetchUserMap(
  workspaceId: string,
): Promise<Map<string, UserBasic>> {
  const { data: workspaceUsers, error } = await supabase.rpc(
    "get_workspace_users_with_emails",
    { workspace_id_param: workspaceId },
  );

  if (error) {
    console.error("Error fetching workspace users:", error);
    return new Map();
  }

  const userMap = new Map<string, UserBasic>();
  (workspaceUsers ?? []).forEach((wu: any) => {
    if (wu.user_id && wu.email) {
      userMap.set(wu.user_id, {
        id: wu.user_id,
        email: wu.email,
        avatar_url: wu.avatar_url || null,
      });
    }
  });
  return userMap;
}

function attachUsers(
  task: Task,
  userMap: Map<string, UserBasic>,
): TaskWithUsers {
  return {
    ...task,
    owner: task.created_by ? (userMap.get(task.created_by) ?? null) : null,
    assignee: task.assignee_user_id
      ? (userMap.get(task.assignee_user_id) ?? null)
      : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// List
// ─────────────────────────────────────────────────────────────────────────────

export async function listTasks(
  workspaceId: string,
  filters: TaskFilters,
): Promise<Task[]> {
  let query = supabase
    .from("tasks")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("parent_task_id", null) // top-level only
    .order("updated_at", { ascending: false });

  if (filters.status && filters.status !== "All") {
    query = query.eq("status", filters.status);
  }

  if (filters.search) {
    query = query.ilike("title", `%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Task[];
}

export async function listTasksWithUsers(
  workspaceId: string,
  filters: TaskFilters,
): Promise<TaskWithUsers[]> {
  const tasks = await listTasks(workspaceId, filters);
  if (tasks.length === 0) return [];

  const userMap = await fetchUserMap(workspaceId);
  return tasks.map((task) => attachUsers(task, userMap));
}

/**
 * Returns top-level tasks enriched with their subtasks.
 * Used by the TaskTable so it can render expand/collapse rows.
 */
export async function listTasksWithSubtasks(
  workspaceId: string,
  filters: TaskFilters,
): Promise<TaskWithUsers[]> {
  // 1. Fetch all tasks in this workspace in a single query (no parent filter)
  let query = supabase
    .from("tasks")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });

  if (filters.status && filters.status !== "All") {
    // Only filter top-level tasks by status; subtasks keep their own status
    // We still need to fetch all so we can nest subtasks, then filter top-level
  }

  const { data: allRows, error } = await query;
  if (error) throw error;

  const allTasks = (allRows ?? []) as Task[];

  // 2. Build user map
  const userMap = await fetchUserMap(workspaceId);

  // 3. Separate primary tasks and subtasks
  const primaryTasks = allTasks.filter((t) => !t.parent_task_id);
  const subtaskRows = allTasks.filter((t) => Boolean(t.parent_task_id));

  // 4. Group subtasks by parent id
  const subtasksByParent = new Map<string, TaskWithUsers[]>();
  subtaskRows.forEach((sub) => {
    const parentId = sub.parent_task_id!;
    if (!subtasksByParent.has(parentId)) subtasksByParent.set(parentId, []);
    subtasksByParent.get(parentId)!.push(attachUsers(sub, userMap));
  });

  // 4b. Batch-fetch file counts for all tasks so the table can show attachment indicators
  const allTaskIds = allTasks.map((t) => t.id);
  const fileCountMap = new Map<string, number>();
  if (allTaskIds.length > 0) {
    const { data: fileRows } = await supabase
      .from("task_files")
      .select("task_id")
      .eq("workspace_id", workspaceId)
      .in("task_id", allTaskIds);
    (fileRows ?? []).forEach((row: { task_id: string }) => {
      fileCountMap.set(row.task_id, (fileCountMap.get(row.task_id) ?? 0) + 1);
    });
  }

  // 5. Apply top-level status filter if requested
  let filtered = primaryTasks;
  if (filters.status && filters.status !== "All") {
    filtered = primaryTasks.filter((t) => t.status === filters.status);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter((t) => t.title.toLowerCase().includes(q));
  }

  // 6. Return top-level tasks with nested subtasks, enriched with file counts
  return filtered.map((task) => ({
    ...attachUsers(task, userMap),
    file_count: fileCountMap.get(task.id) ?? 0,
    subtasks: (subtasksByParent.get(task.id) ?? []).map((sub) => ({
      ...sub,
      file_count: fileCountMap.get(sub.id) ?? 0,
    })),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Subtask list
// ─────────────────────────────────────────────────────────────────────────────

export async function listSubtasks(
  parentTaskId: string,
  workspaceId: string,
): Promise<TaskWithUsers[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("parent_task_id", parentTaskId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  const tasks = (data ?? []) as Task[];
  if (tasks.length === 0) return [];

  const userMap = await fetchUserMap(workspaceId);
  return tasks.map((t) => attachUsers(t, userMap));
}

// ─────────────────────────────────────────────────────────────────────────────
// Create
// ─────────────────────────────────────────────────────────────────────────────

export async function createTask(
  workspaceId: string,
  input: Pick<
    Task,
    "title" | "description" | "status" | "due_date" | "assignee_user_id"
  > &
    Partial<Pick<Task, "priority" | "parent_task_id">>,
): Promise<Task> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      ...input,
      workspace_id: workspaceId,
      created_by: user?.id,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Task;
}

// ─────────────────────────────────────────────────────────────────────────────
// Update / Delete
// ─────────────────────────────────────────────────────────────────────────────

export async function updateTask(
  taskId: string,
  patch: Partial<Task>,
): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", taskId)
    .select("*")
    .single();

  if (error) throw error;
  return data as Task;
}

export async function deleteTask(taskId: string): Promise<void> {
  // 1. Delete subtasks first (cascade in code)
  const { data: subtaskRows } = await supabase
    .from("tasks")
    .select("id")
    .eq("parent_task_id", taskId);

  for (const sub of subtaskRows ?? []) {
    await deleteTask(sub.id);
  }

  // 2. Delete associated files from storage
  const { data: taskFiles, error: taskFilesError } = await supabase
    .from("task_files")
    .select("id, storage_path")
    .eq("task_id", taskId);

  if (taskFilesError) throw taskFilesError;

  const storagePaths = (taskFiles ?? [])
    .map((file) => file.storage_path)
    .filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    );

  if (storagePaths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from("task-attachments")
      .remove(storagePaths);

    if (storageError) throw storageError;
  }

  const { error: taskFilesDeleteError } = await supabase
    .from("task_files")
    .delete()
    .eq("task_id", taskId);

  if (taskFilesDeleteError) throw taskFilesDeleteError;

  const { error: commentsDeleteError } = await supabase
    .from("comments")
    .delete()
    .eq("task_id", taskId);

  if (commentsDeleteError) throw commentsDeleteError;

  const { error: activityDeleteError } = await supabase
    .from("task_activity")
    .delete()
    .eq("task_id", taskId);

  if (activityDeleteError) throw activityDeleteError;

  const { error: timeEntriesDeleteError } = await supabase
    .from("time_entries")
    .delete()
    .eq("task_id", taskId);

  if (timeEntriesDeleteError) throw timeEntriesDeleteError;

  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw error;
}

// ─────────────────────────────────────────────────────────────────────────────
// Comments / Activity
// ─────────────────────────────────────────────────────────────────────────────

export async function listComments(taskId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Comment[];
}

export async function addComment(
  taskId: string,
  body: string,
): Promise<Comment> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("comments")
    .insert({
      task_id: taskId,
      body,
      user_id: user?.id,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Comment;
}

export async function listTaskActivity(
  taskId: string,
): Promise<TaskActivity[]> {
  const { data, error } = await supabase
    .from("task_activity")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as TaskActivity[];
}

export async function logTaskActivity(
  taskId: string,
  type: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from("task_activity").insert({
    task_id: taskId,
    type,
    payload,
  });

  if (error) throw error;
}
