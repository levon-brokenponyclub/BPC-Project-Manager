import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'

import { Card } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'

interface SupportBucket {
  id: string
  period_start: string
  period_end: string
  hours_allocated: number
  hours_used_cached: number
}

async function listSupportBuckets(workspaceId: string): Promise<SupportBucket[]> {
  const { data, error } = await supabase
    .from('support_buckets')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('period_start', { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []) as SupportBucket[]
}

export function SettingsPage(): React.ReactElement {
  const { workspaceId = '' } = useParams<{ workspaceId: string }>()

  const bucketsQuery = useQuery({
    queryKey: ['workspace', workspaceId, 'supportBuckets'],
    queryFn: () => listSupportBuckets(workspaceId),
    enabled: Boolean(workspaceId),
  })

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h1 className="text-xl font-semibold text-foreground">Workspace Settings</h1>
        <p className="mt-1 text-sm text-muted">Workspace ID: {workspaceId}</p>
      </Card>

      <Card className="p-5">
        <h2 className="text-lg font-semibold text-foreground">Support Buckets</h2>
        <div className="mt-3 space-y-2">
          {(bucketsQuery.data ?? []).map((bucket) => (
            <div key={bucket.id} className="rounded-xl bg-stone-50 px-3 py-2 text-sm">
              <p className="font-medium text-foreground">
                {new Date(bucket.period_start).toLocaleDateString()} - {new Date(bucket.period_end).toLocaleDateString()}
              </p>
              <p className="text-muted">
                Allocated: {bucket.hours_allocated}h · Cached used: {bucket.hours_used_cached}h
              </p>
            </div>
          ))}
          {(bucketsQuery.data ?? []).length === 0 ? <p className="text-sm text-muted">No support buckets found.</p> : null}
        </div>
      </Card>
    </div>
  )
}