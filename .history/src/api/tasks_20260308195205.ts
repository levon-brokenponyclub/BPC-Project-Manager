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
  subtasks?: TaskWithUsers[];
  subtask_count?: number;
  completed_subtask_count?: number;
  is_subtask?: boolean;
}

export async function listTasks(
  workspaceId: string,
  filters: TaskFilters,
): Promise<Task[]> {
  let query = supabase
    .from("tasks")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("parent_task_id", null) // Only get parent tasks, not subtasks
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

export async function listTasksWithUsers(
  workspaceId: string,
  filters: TaskFilters,
): Promise<TaskWithUsers[]> {
  // Get parent tasks only (no subtasks at top level)
  const tasks = await listTasks(workspaceId, filters);

  // Get all subtasks for these parent tasks
  const parentTaskIds = tasks.map((t) => t.id);
  let subtasksData: Task[] = [];
  if (parentTaskIds.length > 0) {
    const { data: subtasks, error: subtasksError } = await supabase
      .from("tasks")
      .select("*")
      .in("parent_task_id", parentTaskIds)
      .order("created_at", { ascending: true });

    if (!subtasksError && subtasks) {
      subtasksData = subtasks as Task[];
    }
  }

  // Get unique user IDs from both tasks and subtasks
  const userIds = new Set<string>();
  [...tasks, ...subtasksData].forEach((task) => {
    if (task.created_by) userIds.add(task.created_by);
    if (task.assignee_user_id) userIds.add(task.assignee_user_id);
  });

  if (userIds.size === 0) {
    return tasks.map((task) => ({
      ...task,
      owner: null,
      assignee: null,
      subtasks: [],
      subtask_count: 0,
      completed_subtask_count: 0,
      is_subtask: false,
    }));
  }

  // Fetch user details from workspace_users using RPC function
  const { data: workspaceUsers, error: usersError } = await supabase.rpc(
    "get_workspace_users_with_emails",
    {
      workspace_id_param: workspaceId,
    },
  );

  if (usersError) {
    console.error("Error fetching workspace users:", usersError);
  }

  // Build user map
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

  // Attach user details to subtasks
  const enrichedSubtasks = subtasksData.map((subtask) => ({
    ...subtask,
    owner: subtask.created_by ? userMap.get(subtask.created_by) || null : null,
    assignee: subtask.assignee_user_id
      ? userMap.get(subtask.assignee_user_id) || null
      : null,
    is_subtask: true,
  }));

  // Group subtasks by parent
  const subtasksByParent = new Map<string, TaskWithUsers[]>();
  enrichedSubtasks.forEach((subtask) => {
    if (subtask.parent_task_id) {
      const existing = subtasksByParent.get(subtask.parent_task_id) || [];
      subtasksByParent.set(subtask.parent_task_id, [...existing, subtask]);
    }
  });

  // Attach user details and subtasks to parent tasks
  return tasks.map((task) => {
    const taskSubtasks = subtasksByParent.get(task.id) || [];
    const completedCount = taskSubtasks.filter(
      (st) => st.status === "Complete",
    ).length;

    return {
      ...task,
      owner: task.created_by ? userMap.get(task.created_by) || null : null,
      assignee: task.assignee_user_id
        ? userMap.get(task.assignee_user_id) || null
        : null,
      subtasks: taskSubtasks,
      subtask_count: taskSubtasks.length,
      completed_subtask_count: completedCount,
      is_subtask: false,
    };
  });
}

export async function listSubtasks(
  parentTaskId: string,
  workspaceId: string,
): Promise<TaskWithUsers[]> {
  const { data: subtasks, error: subtasksError } = await supabase
    .from("tasks")
    .select("*")
    .eq("parent_task_id", parentTaskId)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (subtasksError) {
    throw subtasksError;
  }

  const tasks = (subtasks ?? []) as Task[];

  // Get unique user IDs
  const userIds = new Set<string>();
  tasks.forEach((task) => {
    if (task.created_by) userIds.add(task.created_by);
    if (task.assignee_user_id) userIds.add(task.assignee_user_id);
  });

  if (userIds.size === 0) {
    return tasks.map((task) => ({
      ...task,
      owner: null,
      assignee: null,
      is_subtask: true,
    }));
  }

  // Fetch user details
  const { data: workspaceUsers, error: usersError } = await supabase.rpc(
    "get_workspace_users_with_emails",
    {
      workspace_id_param: workspaceId,
    },
  );

  if (usersError) {
    console.error("Error fetching workspace users:", usersError);
  }

  // Build user map
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

  // Attach user details
  return tasks.map((task) => ({
    ...task,
    owner: task.created_by ? userMap.get(task.created_by) || null : null,
    assignee: task.assignee_user_id
      ? userMap.get(task.assignee_user_id) || null
      : null,
    is_subtask: true,
  }));
}

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
  // First, get all subtasks of this task
  const { data: subtasks, error: subtasksError } = await supabase
    .from("tasks")
    .select("id")
    .eq("parent_task_id", taskId);

  if (subtasksError) {
    throw subtasksError;
  }

  const subtaskIds = (subtasks ?? []).map(st => st.id);

  // Delete files, comments, activity, time entries for both parent and subtasks
  const allTaskIds = [taskId, ...subtaskIds];

  // Delete all task files
  for (const id of allTaskIds) {
    const { data: taskFiles, error: taskFilesError } = await supabase
      .from("task_files")
      .select("id, storage_path")
      .eq("task_id", id);

    if (taskFilesError) {
      throw taskFilesError;
    }

    const storagePaths = (taskFiles ?? [])
      .map((file) => file.storage_path)
      .filter(
        (value): value is string => typeof value === "string" && value.length > 0,
      );

    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from("task-attachments")
        .remove(storagePaths);

      if (storageError) {
        throw storageError;
      }
    }

    const { error: taskFilesDeleteError } = await supabase
      .from("task_files")
      .delete()
      .eq("task_id", id);

    if (taskFilesDeleteError) {
      throw taskFilesDeleteError;
    }
  }

  // Delete comments for all tasks
  if (allTaskIds.length > 0) {
    const { error: commentsDeleteError } = await supabase
      .from("comments")
      .delete()
      .in("task_id", allTaskIds);

    if (commentsDeleteError) {
      throw commentsDeleteError;
    }
  }

  // Delete activity for all tasks
  if (allTaskIds.length > 0) {
    const { error: activityDeleteError } = await supabase
      .from("task_activity")
      .delete()
      .in("task_id", allTaskIds);

    if (activityDeleteError) {
      throw activityDeleteError;
    }
  }

  // Delete time entries for all tasks
  if (allTaskIds.length > 0) {
    const { error: timeEntriesDeleteError } = await supabase
      .from("time_entries")
      .delete()
      .in("task_id", allTaskIds);

    if (timeEntriesDeleteError) {
      throw timeEntriesDeleteError;
    }
  }

  // Delete subtasks first
  if (subtaskIds.length > 0) {
    const { error: subtasksDeleteError } = await supabase
      .from("tasks")
      .delete()
      .in("id", subtaskIds);

    if (subtasksDeleteError) {
      throw subtasksDeleteError;
    }
  }

  // Finally delete the parent task
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
