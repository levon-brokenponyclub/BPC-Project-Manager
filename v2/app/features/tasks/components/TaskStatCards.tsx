import * as React from "react"
import { useMemo } from "react"
import { Bell, CalendarDays } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Calendar } from "~/components/ui/calendar"
import type { TaskRow } from "~/features/tasks/types"

const DONE_STATUSES: TaskRow["status"][] = ["Complete", "Cancelled"]

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0]
}

export function TaskStatCards({
  tasks,
  inboxUnreadCount,
  activityUnreadCount,
}: {
  tasks: TaskRow[]
  inboxUnreadCount: number
  activityUnreadCount: number
}) {
  const today = toDateStr(new Date())
  const [calDate, setCalDate] = React.useState<Date | undefined>(new Date())

  const todayCount = useMemo(() => {
    return tasks.filter((t) => t.due_date?.split("T")[0] === today).length
  }, [tasks, today])

  // Dates with tasks due — used as calendar modifiers
  const dueDates = useMemo(() => {
    return tasks
      .filter((t) => t.due_date && !DONE_STATUSES.includes(t.status))
      .map((t) => new Date(t.due_date!))
  }, [tasks])

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Card 1: Today's Tasks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today's Tasks</CardTitle>
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{todayCount}</div>
          <p className="text-xs text-muted-foreground">due today</p>
        </CardContent>
      </Card>

      {/* Card 2: Notifications */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Notifications</CardTitle>
          <Bell className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {inboxUnreadCount + activityUnreadCount}
          </div>
          <p className="text-xs text-muted-foreground">
            {inboxUnreadCount} messages · {activityUnreadCount} activity
          </p>
        </CardContent>
      </Card>

      {/* Card 3: Calendar */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Calendar</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center p-0 pb-2">
          <Calendar
            mode="single"
            selected={calDate}
            onSelect={setCalDate}
            modifiers={{ due: dueDates }}
            modifiersClassNames={{
              due: "bg-primary/20 font-semibold text-primary rounded-md",
            }}
            className="origin-top scale-90"
          />
        </CardContent>
      </Card>
    </div>
  )
}
