import { isDemoMode, supabase } from "@/lib/supabase";

export interface TaskFileRecord {
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

const demoTaskFilesStore = new Map<string, TaskFileRecord[]>();

function sanitizeFileName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 160);
}

function getStoreKey(workspaceId: string, taskId: string): string {
  return `${workspaceId}:${taskId}`;
}

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `tmp-${Math.random().toString(36).slice(2, 12)}`;
}

export async function listTaskFiles(
  workspaceId: string,
  taskId: string,
): Promise<TaskFileRecord[]> {
  if (isDemoMode) {
    const files =
      demoTaskFilesStore.get(getStoreKey(workspaceId, taskId)) ?? [];
    return [...files].sort((a, b) =>
      a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0,
    );
  }

  const { data, error } = await supabase
    .from("task_files")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as TaskFileRecord[];
}

export async function uploadTaskFile(
  workspaceId: string,
  taskId: string,
  file: File,
): Promise<TaskFileRecord> {
  const safeName = sanitizeFileName(file.name || "attachment");
  const fileUuid = randomId();
  const storagePath = `${workspaceId}/${taskId}/${fileUuid}-${safeName}`;

  if (isDemoMode) {
    const demoRow: TaskFileRecord = {
      id: fileUuid,
      workspace_id: workspaceId,
      task_id: taskId,
      uploader_user_id: "demo-user",
      storage_path: storagePath,
      file_name: safeName,
      mime_type: file.type || null,
      size_bytes: Number.isFinite(file.size) ? file.size : null,
      created_at: new Date().toISOString(),
    };

    const key = getStoreKey(workspaceId, taskId);
    const current = demoTaskFilesStore.get(key) ?? [];
    demoTaskFilesStore.set(key, [demoRow, ...current]);

    return demoRow;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw userError ?? new Error("Not authenticated");
  }

  const { error: uploadError } = await supabase.storage
    .from("task-attachments")
    .upload(storagePath, file, {
      contentType: file.type || undefined,
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("task_files")
    .insert({
      workspace_id: workspaceId,
      task_id: taskId,
      uploader_user_id: user.id,
      storage_path: storagePath,
      file_name: safeName,
      mime_type: file.type || null,
      size_bytes: Number.isFinite(file.size) ? file.size : null,
    })
    .select("*")
    .single();

  if (insertError) {
    await supabase.storage.from("task-attachments").remove([storagePath]);
    throw insertError;
  }

  return inserted as TaskFileRecord;
}

export async function deleteTaskFile(fileId: string): Promise<void> {
  if (isDemoMode) {
    demoTaskFilesStore.forEach((files, key) => {
      const next = files.filter((file) => file.id !== fileId);
      if (next.length !== files.length) {
        demoTaskFilesStore.set(key, next);
      }
    });
    return;
  }

  const { data: file, error: fileError } = await supabase
    .from("task_files")
    .select("id, storage_path")
    .eq("id", fileId)
    .single();

  if (fileError || !file) {
    throw fileError ?? new Error("File not found");
  }

  const { error: storageDeleteError } = await supabase.storage
    .from("task-attachments")
    .remove([file.storage_path]);

  if (storageDeleteError) {
    throw storageDeleteError;
  }

  const { error: deleteError } = await supabase
    .from("task_files")
    .delete()
    .eq("id", fileId);

  if (deleteError) {
    throw deleteError;
  }
}

export async function getSignedFileUrl(storagePath: string): Promise<string> {
  if (isDemoMode) {
    return "";
  }

  const { data, error } = await supabase.storage
    .from("task-attachments")
    .createSignedUrl(storagePath, 60 * 10);

  if (error || !data?.signedUrl) {
    throw error ?? new Error("Unable to create signed URL");
  }

  return data.signedUrl;
}
