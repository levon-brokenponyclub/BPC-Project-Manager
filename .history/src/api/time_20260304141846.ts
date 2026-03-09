import { supabase } from '@/lib/supabase'
import { formatDurationHours, toIsoNow } from '@/lib/utils'
import type { SupportSummary, TimeEntry } from '@/types/models'

export interface RunningTimer {
  entry: TimeEntry
  taskTitle: string
}

export async function getRunningTimer(workspaceId: string): Promise<RunningTimer | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data, error } = await supabase
    .from('time_entries')
    .select('*, tasks!inner(title)')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  const task = (data as { tasks?: { title?: string } }).tasks
  return {
    entry: data as TimeEntry,
    taskTitle: task?.title ?? 'Task',
  }
}

export async function listTimeEntries(workspaceId: string): Promise<TimeEntry[]> {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }
  return (data ?? []) as TimeEntry[]
}

export async function startTaskTimer(workspaceId: string, taskId: string): Promise<void> {
  const { error: rpcError } = await supabase.rpc('start_task_timer', {
    p_workspace_id: workspaceId,
    p_task_id: taskId,
  })

  if (!rpcError) {
    return
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('No active user session')
  }

  const { data: running, error: runningErr } = await supabase
    .from('time_entries')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .is('ended_at', null)

  if (runningErr) {
    throw runningErr
  }

  const nowIso = toIsoNow()
  for (const entry of running ?? []) {
    const startedAt = new Date((entry as TimeEntry).started_at).getTime()
    const endedAt = new Date(nowIso).getTime()
    const durationSeconds = Math.max(0, Math.round((endedAt - startedAt) / 1000))
    await supabase.from('time_entries').update({ ended_at: nowIso, duration_seconds: durationSeconds }).eq('id', entry.id)
  }

  const { error } = await supabase.from('time_entries').insert({
    workspace_id: workspaceId,
    task_id: taskId,
    user_id: user.id,
    started_at: nowIso,
    ended_at: null,
    duration_seconds: null,
  })

  if (error) {
    throw error
  }
}

export async function stopTaskTimer(workspaceId: string, taskId: string): Promise<void> {
  const { error: rpcError } = await supabase.rpc('stop_task_timer', {
    p_workspace_id: workspaceId,
    p_task_id: taskId,
  })

  if (!rpcError) {
    return
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('No active user session')
  }

  const { data: entry, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('task_id', taskId)
    .eq('user_id', user.id)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!entry) {
    return
  }

  const endedAt = toIsoNow()
  const durationSeconds = Math.max(
    0,
    Math.round((new Date(endedAt).getTime() - new Date((entry as TimeEntry).started_at).getTime()) / 1000),
  )

  const { error: updateError } = await supabase
    .from('time_entries')
    .update({ ended_at: endedAt, duration_seconds: durationSeconds })
    .eq('id', (entry as TimeEntry).id)

  if (updateError) {
    throw updateError
  }
}

export async function getWorkspaceSupportSummary(workspaceId: string): Promise<SupportSummary> {
  const { data, error } = await supabase
    .from('workspace_support_summary')
    .select('*')
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  if (!error && data) {
    return data as SupportSummary
  }

  const { data: bucket, error: bucketError } = await supabase
    .from('support_buckets')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('period_start', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (bucketError) {
    throw bucketError
  }

  const { data: entries, error: entriesError } = await supabase
    .from('time_entries')
    .select('duration_seconds')
    .eq('workspace_id', workspaceId)

  if (entriesError) {
    throw entriesError
  }

  const usedSeconds = (entries ?? []).reduce((total, row) => total + Number(row.duration_seconds ?? 0), 0)
  const usedHours = Number(formatDurationHours(usedSeconds))
  const allocated = Number((bucket as { hours_allocated?: number } | null)?.hours_allocated ?? 0)

  return {
    workspace_id: workspaceId,
    hours_allocated: allocated,
    hours_used: usedHours,
    hours_remaining: Math.max(0, Number((allocated - usedHours).toFixed(2))),
  }
}

export interface HoursBreakdownRow {
  task_id: string
  task_title: string
  total_seconds: number
  total_hours: string
}

export async function getHoursBreakdown(workspaceId: string): Promise<HoursBreakdownRow[]> {
  const { data, error } = await supabase
    .from('time_entries')
    .select('task_id, duration_seconds, tasks(title)')
    .eq('workspace_id', workspaceId)

  if (error) {
    throw error
  }

  const map = new Map<string, HoursBreakdownRow>()
  for (const row of data ?? []) {
    const taskId = String(row.task_id)
    const taskTitle = ((row as { tasks?: { title?: string } }).tasks?.title ?? 'Untitled Task') as string
    const current = map.get(taskId)
    const duration = Number(row.duration_seconds ?? 0)

    if (!current) {
      map.set(taskId, {
        task_id: taskId,
        task_title: taskTitle,
        total_seconds: duration,
        total_hours: formatDurationHours(duration),
      })
      continue
    }

    current.total_seconds += duration
    current.total_hours = formatDurationHours(current.total_seconds)
  }

  return [...map.values()].sort((a, b) => b.total_seconds - a.total_seconds)
}