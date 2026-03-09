import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'

import { getHoursBreakdown } from '@/api/time'
import { Card } from '@/components/ui/card'
import { queryKeys } from '@/lib/queryKeys'

export function ReportsPage(): React.ReactElement {
  const { workspaceId = '' } = useParams<{ workspaceId: string }>()

  const breakdownQuery = useQuery({
    queryKey: queryKeys.hoursBreakdown(workspaceId),
    queryFn: () => getHoursBreakdown(workspaceId),
    enabled: Boolean(workspaceId),
  })

  return (
    <Card className="p-5">
      <h1 className="text-xl font-semibold text-foreground">Hours Used Breakdown</h1>
      <p className="mt-1 text-sm text-muted">Simple report by task for this workspace.</p>

      <div className="mt-4 overflow-hidden rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50">
            <tr>
              <th className="px-4 py-2">Task</th>
              <th className="px-4 py-2">Hours Used</th>
            </tr>
          </thead>
          <tbody>
            {(breakdownQuery.data ?? []).map((row) => (
              <tr key={row.task_id} className="border-t border-border">
                <td className="px-4 py-2">{row.task_title}</td>
                <td className="px-4 py-2">{row.total_hours}h</td>
              </tr>
            ))}
            {(breakdownQuery.data ?? []).length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={2}>
                  No time entries yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Card>
  )
}