import { supabase } from "@/lib/supabase";
import type { WorkspaceAsset } from "@/types/models";

export type AssetType = "file" | "link" | "login" | "plugin";

export interface CreateAssetInput {
  type: AssetType;
  title: string;
  description?: string | null;
  category?: string | null;
  file_name?: string | null;
  file_path?: string | null;
  file_size_bytes?: number | null;
  url?: string | null;
  username?: string | null;
  notes?: string | null;
  vendor?: string | null;
  client_visible?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function sanitizeFileName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 160);
}

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `tmp-${Math.random().toString(36).slice(2, 12)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function listWorkspaceAssets(
  workspaceId: string,
): Promise<WorkspaceAsset[]> {
  const { data, error } = await supabase
    .from("workspace_assets")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as WorkspaceAsset[];
}

export async function createWorkspaceAsset(
  workspaceId: string,
  input: CreateAssetInput,
): Promise<WorkspaceAsset> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("workspace_assets")
    .insert({
      workspace_id: workspaceId,
      created_by: user.id,
      ...input,
      client_visible: input.client_visible ?? true,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as WorkspaceAsset;
}

export async function updateWorkspaceAsset(
  workspaceId: string,
  assetId: string,
  input: Partial<CreateAssetInput>,
): Promise<WorkspaceAsset> {
  const { data, error } = await supabase
    .from("workspace_assets")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", assetId)
    .eq("workspace_id", workspaceId)
    .select("*")
    .single();

  if (error) throw error;
  return data as WorkspaceAsset;
}

export async function deleteWorkspaceAsset(
  workspaceId: string,
  assetId: string,
  filePath?: string | null,
): Promise<void> {
  // Remove file from storage first (best-effort; don't block on error)
  if (filePath) {
    await supabase.storage.from("workspace-assets").remove([filePath]);
  }

  const { error } = await supabase
    .from("workspace_assets")
    .delete()
    .eq("id", assetId)
    .eq("workspace_id", workspaceId);

  if (error) throw error;
}

// ─────────────────────────────────────────────────────────────────────────────
// File upload
// ─────────────────────────────────────────────────────────────────────────────

export async function uploadAssetFile(
  workspaceId: string,
  file: File,
): Promise<{ filePath: string; fileName: string; fileSizeBytes: number }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const safeName = sanitizeFileName(file.name || "asset");
  const fileUuid = randomId();
  const storagePath = `${workspaceId}/${fileUuid}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("workspace-assets")
    .upload(storagePath, file, {
      contentType: file.type || undefined,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  return {
    filePath: storagePath,
    fileName: safeName,
    fileSizeBytes: file.size,
  };
}

export async function createAssetFileDownloadUrl(
  filePath: string,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from("workspace-assets")
    .createSignedUrl(filePath, 3600);

  if (error) throw error;
  return data.signedUrl;
}
