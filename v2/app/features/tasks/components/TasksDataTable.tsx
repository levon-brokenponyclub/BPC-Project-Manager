"use client"

import * as React from "react"
import {
  type ColumnFiltersState,
  type ExpandedState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import { Button } from "~/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import { Input } from "~/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import type { TaskRow } from "../types"
import { columns } from "./columns"
import { cn } from "~/lib/utils"

// ─── Component ────────────────────────────────────────────────────────────────

interface TasksDataTableProps {
  tasks: TaskRow[]
  selectedId?: string
  onSelect?: (row: TaskRow) => void
}

export function TasksDataTable({
  tasks,
  selectedId,
  onSelect,
}: TasksDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "created_at", desc: true },
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [expanded, setExpanded] = React.useState<ExpandedState>({})

  const groupedTasks = React.useMemo<TaskRow[]>(() => {
    const statusOrder: TaskRow["status"][] = [
      "Todo",
      "Upcoming",
      "In Progress",
      "In Review",
      "Awaiting Client",
      "On Hold",
      "Complete",
      "Cancelled",
    ]

    const byStatus = new Map<TaskRow["status"], TaskRow[]>()
    for (const task of tasks) {
      const existing = byStatus.get(task.status) ?? []
      existing.push(task)
      byStatus.set(task.status, existing)
    }

    const sortByCreatedAtDesc = (rows: TaskRow[]) =>
      [...rows].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

    return statusOrder
      .map((status) => {
        const statusTasks = byStatus.get(status)
        if (!statusTasks?.length) return null

        return {
          id: `__status_group__:${status}`,
          workspace_id: "",
          title: `${status} (${statusTasks.length})`,
          status,
          priority: null,
          due_date: null,
          assignee_user_id: null,
          created_by: "",
          created_at: "1970-01-01T00:00:00.000Z",
          updated_at: "1970-01-01T00:00:00.000Z",
          parent_task_id: null,
          description: null,
          estimated_hours: null,
          billable: false,
          client_visible: false,
          blocked: false,
          blocked_reason: null,
          assignee_email: null,
          subRows: sortByCreatedAtDesc(statusTasks),
        } as TaskRow
      })
      .filter((row): row is TaskRow => Boolean(row))
  }, [tasks])

  const defaultExpanded = React.useMemo<ExpandedState>(() => {
    return groupedTasks.reduce<Record<string, boolean>>((acc, row) => {
      acc[row.id] = true
      return acc
    }, {})
  }, [groupedTasks])

  React.useEffect(() => {
    setExpanded((prev) => {
      if (prev === true) return prev
      if (Object.keys(prev).length > 0) return prev
      return defaultExpanded
    })
  }, [defaultExpanded])

  const table = useReactTable({
    data: groupedTasks,
    columns,
    getRowId: (row) => row.id,
    getSubRows: (row) => row.subRows,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onExpandedChange: setExpanded,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      expanded,
    },
  })

  return (
    <div className="flex flex-col gap-4 px-6">
      {/* Toolbar */}
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter tasks..."
          value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("title")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id.replace(/_/g, " ")}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(
                    row.depth > 0 ? "bg-muted/30" : undefined,
                    selectedId === row.original.id && "bg-accent",
                    onSelect &&
                      !row.original.id.startsWith("__status_group__:") &&
                      "cursor-pointer"
                  )}
                  onClick={() => {
                    if (!onSelect) return
                    if (row.original.id.startsWith("__status_group__:")) return
                    onSelect(row.original)
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
