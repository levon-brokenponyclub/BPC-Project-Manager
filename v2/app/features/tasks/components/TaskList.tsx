import { useState } from "react"
import { MoreHorizontal } from "lucide-react"
import { Badge } from "~/components/ui/badge"
import { Card, CardContent } from "~/components/ui/card"
import { Checkbox } from "~/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import { Button } from "~/components/ui/button"

type TaskStatus = "todo" | "in-progress" | "done"
type TaskPriority = "low" | "medium" | "high" | "urgent"

interface Task {
  id: string
  title: string
  status: TaskStatus | string
  due_date?: string | null
  priority?: TaskPriority | null
  assignee?: { email: string | null; avatar_url?: string | null }
}

interface TaskListProps {
  tasks: Task[]
}

function normaliseStatus(raw: string): TaskStatus {
  if (raw === "done" || raw === "complete" || raw === "completed") return "done"
  if (raw === "in-progress" || raw === "in_progress" || raw === "active")
    return "in-progress"
  return "todo"
}

const badgeVariant: Record<TaskStatus, "default" | "secondary" | "outline"> = {
  todo: "outline",
  "in-progress": "secondary",
  done: "default",
}

const badgeLabel: Record<TaskStatus, string> = {
  todo: "Todo",
  "in-progress": "In Progress",
  done: "Done",
}

export function TaskList({ tasks }: TaskListProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  function toggle(id: string) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="flex flex-col gap-2">
      {tasks.map((task) => {
        const status = normaliseStatus(task.status)
        return (
          <Card key={task.id}>
            <CardContent className="flex items-center gap-4 px-4 py-3">
              <Checkbox
                id={`task-${task.id}`}
                checked={!!checked[task.id]}
                onCheckedChange={() => toggle(task.id)}
              />

              <label
                htmlFor={`task-${task.id}`}
                className="flex-1 cursor-pointer text-sm leading-none text-foreground select-none"
              >
                {task.title}
              </label>

              <Badge variant={badgeVariant[status]}>{badgeLabel[status]}</Badge>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Task actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Edit</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive focus:text-destructive">
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
