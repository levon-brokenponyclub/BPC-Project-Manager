import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""

export const isSupabaseConfigured = Boolean(url && key)

const supabaseClient = isSupabaseConfigured ? createClient(url, key) : null

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    throw new Error(
      "Supabase environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    )
  }

  return supabaseClient
}

// ---- Types matching DB schema ----

export type DbProject = {
  id: string
  workspace_id?: string
  name: string
  description: string
  progress: number
  due_date: string
  archived?: boolean
  created_at: string
}

export type DbTask = {
  id: string
  project_id: string
  name: string
  description: string | null
  status: string
  date_added?: string
  due_date: string
  priority: string
  created_at: string
  task_files?: DbTaskFile[]
}

export type DbTaskFile = {
  id: string
  task_id: string
  name: string
  size: number
  type: string
  uploaded_at: string
  url?: string
}

export type DbProjectFile = {
  id: string
  project_id: string
  name: string
  size: number
  type: string
  uploaded_at: string
}

// ---- Project queries ----

export async function fetchProjects() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw error
  return data as DbProject[]
}

export async function createProject(project: Omit<DbProject, "id" | "created_at">) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("projects")
    .insert(project)
    .select()
    .single()
  if (error) {
    console.error("Supabase error creating project:", error);
    throw new Error(`Failed to create project: ${error.message}`);
  }
  return data as DbProject
}

export async function updateProjectProgress(id: string, progress: number) {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from("projects")
    .update({ progress })
    .eq("id", id)
  if (error) throw error
}

// ---- Task queries ----

export async function fetchTasks(projectId: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("tasks")
    .select("*, task_files(*)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true })
  if (error) throw error
  return data as DbTask[]
}

export async function deleteProject(id: string) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from("projects").delete().eq("id", id)
  if (error) throw error
}

export async function deleteTask(id: string) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from("tasks").delete().eq("id", id)
  if (error) throw error
}

export async function updateProject(id: string, patch: Partial<Omit<DbProject, "id" | "created_at">>) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from("projects").update(patch).eq("id", id)
  if (error) throw error
}

export async function updateTask(id: string, patch: Partial<Omit<DbTask, "id" | "created_at" | "task_files">>) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from("tasks").update(patch).eq("id", id)
  if (error) throw error
}

export async function createTask(task: Omit<DbTask, "id" | "created_at" | "task_files">) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("tasks")
    .insert(task)
    .select()
    .single()
  if (error) throw error
  return data as DbTask
}

export async function createTaskFile(file: Omit<DbTaskFile, "id"> & { url?: string }) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("task_files").insert(file).select("id").single()
  if (error) throw error
  return data as { id: string }
}

// ---- Project file queries ----

export async function fetchProjectFiles(projectId: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("project_files")
    .select("*")
    .eq("project_id", projectId)
    .order("uploaded_at", { ascending: false })
  if (error) throw error
  return data as DbProjectFile[]
}

export async function createProjectFile(file: Omit<DbProjectFile, "id">) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("project_files")
    .insert(file)
    .select()
    .single()
  if (error) throw error
  return data as DbProjectFile
}

export async function deleteProjectFile(id: string) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from("project_files").delete().eq("id", id)
  if (error) throw error
}

export async function deleteTaskFile(id: string) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from("task_files").delete().eq("id", id)
  if (error) throw error
}

// ---- Storage uploads ----

export async function uploadTaskAsset(file: File, taskId?: string): Promise<string> {
  const supabase = getSupabaseClient()
  const ext = file.name.split(".").pop() ?? "bin"
  const path = `${taskId ?? "draft"}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from("task-assets").upload(path, file, { upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from("task-assets").getPublicUrl(path)
  return data.publicUrl
}

export async function deleteTaskAsset(url: string) {
  const supabase = getSupabaseClient()
  // Extract path from public URL
  const marker = "/task-assets/"
  const idx = url.indexOf(marker)
  if (idx === -1) return
  const path = url.slice(idx + marker.length)
  await supabase.storage.from("task-assets").remove([path])
}

// ---- Avatar / profile ----

export async function fetchProfile(userId: string): Promise<{ avatar_url: string | null; full_name: string | null } | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("avatar_url, full_name")
    .eq("id", userId)
    .single()
  if (error) return null
  return data as { avatar_url: string | null; full_name: string | null }
}

export async function uploadAvatar(file: File, userId: string): Promise<string> {
  const supabase = getSupabaseClient()
  const ext = file.name.split(".").pop() ?? "jpg"
  const path = `${userId}/avatar.${ext}`
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from("avatars").getPublicUrl(path)
  // Bust cache with timestamp
  return `${data.publicUrl}?t=${Date.now()}`
}

export async function updateProfileAvatar(userId: string, avatarUrl: string) {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq("id", userId)
  if (error) throw error
}

// ---- Task activity queries ----

export type DbTaskActivity = {
  id: string
  task_id: string
  text: string
  created_at: string
}

export async function fetchTaskActivity(taskId: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("task_activity")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true })
  if (error) throw error
  return data as DbTaskActivity[]
}

export async function createTaskActivity(entry: Omit<DbTaskActivity, "id" | "created_at">) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("task_activity")
    .insert(entry)
    .select()
    .single()
  if (error) throw error
  return data as DbTaskActivity
}
