"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown, ChevronRight } from "lucide-react"
import {
  IconCircleCheckFilled,
  IconCircleDashed,
  IconCircleX,
  IconClock,
  IconDotsVertical,
  IconLoader,
} from "@tabler/icons-react"

import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Checkbox } from "~/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import type { TaskRow, TaskStatus } from "../types"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusIcon: Record<TaskStatus, React.ReactNode> = {
  Todo: <IconCircleDashed className="size-3.5 text-muted-foreground" />,
  Upcoming: <IconCircleDashed className="size-3.5 text-muted-foreground" />,
  "In Progress": <IconLoader className="size-3.5 text-blue-500" />,
  "In Review": <IconLoader className="size-3.5 text-yellow-500" />,
  "Awaiting Client": <IconClock className="size-3.5 text-orange-500" />,
  "On Hold": <IconClock className="size-3.5 text-muted-foreground" />,
  Complete: (
    <IconCircleCheckFilled className="size-3.5 fill-green-500 dark:fill-green-400" />
  ),
  Cancelled: <IconCircleX className="size-3.5 text-destructive" />,
}

const priorityVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  Normal: "outline",
  Medium: "secondary",
  High: "secondary",
  Urgent: "destructive",
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function isStatusGroupRow(task: TaskRow): boolean {
  return task.id.startsWith("__status_group__:")
}

// ─── Column definitions ───────────────────────────────────────────────────────

export const columns: ColumnDef<TaskRow>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        disabled={isStatusGroupRow(row.original)}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "title",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Task
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div
        className="flex items-center gap-1"
        style={{ paddingLeft: `${row.depth * 1.25}rem` }}
      >
        {row.getCanExpand() ? (
          <button
            onClick={row.getToggleExpandedHandler()}
            className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted"
          >
            {row.getIsExpanded() ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
          </button>
        ) : (
          <span className="size-5 shrink-0" />
        )}
        <span
          className={`font-medium ${
            row.depth > 0 ? "text-muted-foreground" : "text-foreground"
          }`}
        >
          {row.original.title}
        </span>
      </div>
    ),
    enableHiding: false,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status
      return (
        <Badge
          variant="outline"
          className="gap-1.5 px-1.5 text-muted-foreground"
        >
          {statusIcon[status]}
          {status}
        </Badge>
      )
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Date Added
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">
        {isStatusGroupRow(row.original)
          ? "—"
          : formatDate(row.original.created_at)}
      </span>
    ),
  },
  {
    accessorKey: "due_date",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Due Date
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">
        {formatDate(row.original.due_date)}
      </span>
    ),
  },
  {
    accessorKey: "priority",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Priority
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const priority = row.original.priority
      if (!priority) return <span className="text-muted-foreground">—</span>
      return (
        <Badge variant={priorityVariant[priority] ?? "outline"}>
          {priority}
        </Badge>
      )
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      if (isStatusGroupRow(row.original)) return null
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="flex size-8 text-muted-foreground data-[state=open]:bg-muted"
            >
              <IconDotsVertical className="size-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>View</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
    enableHiding: false,
    enableSorting: false,
  },
]
