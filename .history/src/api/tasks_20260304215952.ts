import { supabase } from "@/lib/supabase";
import type { Comment, Task, TaskActivity, TaskStatus } from "@/types/models";

export interface TaskFilters {
  status?: TaskStatus | "All";
  search?: string;
}

export async function listTasks(
  workspaceId: string,
  filters: TaskFilters,
): Promise<Task[]> {
  let query = supabase
    .from("tasks")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });

  if (filters.status && filters.status !== "All") {
    query = query.eq("status", filters.status);
  }

  if (filters.search) {
    query = query.ilike("title", `%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }
  return (data ?? []) as Task[];
}

export async function createTask(
  workspaceId: string,
  input: Pick<
    Task,
    "title" | "description" | "status" | "due_date" | "assignee_user_id"
  >,
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

  if (error) {
    throw error;
  }

  return data as Task;
}

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

  if (error) {
    throw error;
  }

  return data as Task;
}

export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);

  if (error) {
    throw error;
  }
}

export async function listComments(taskId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }
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

  if (error) {
    throw error;
  }

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

  if (error) {
    throw error;
  }

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

  if (error) {
    throw error;
  }
}
