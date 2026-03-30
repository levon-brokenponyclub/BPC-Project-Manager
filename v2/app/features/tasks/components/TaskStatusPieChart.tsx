"use client"

import * as React from "react"
import { Label, Pie, PieChart, Sector } from "recharts"
import type { PieSectorShapeProps } from "recharts/types/polar/Pie"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import {
  ChartContainer,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "~/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import type { TaskRow, TaskStatus } from "../types"

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_KEY_MAP: Record<TaskStatus, string> = {
  Todo: "todo",
  Upcoming: "upcoming",
  "In Progress": "inProgress",
  "In Review": "inReview",
  "Awaiting Client": "awaitingClient",
  "On Hold": "onHold",
  Complete: "complete",
  Cancelled: "cancelled",
}

const chartConfig = {
  count: { label: "Tasks" },
  todo: { label: "Todo", color: "oklch(0.70 0.10 250)" },
  upcoming: { label: "Upcoming", color: "oklch(0.65 0.15 290)" },
  inProgress: { label: "In Progress", color: "oklch(0.55 0.20 250)" },
  inReview: { label: "In Review", color: "oklch(0.72 0.16 85)" },
  awaitingClient: { label: "Awaiting Client", color: "oklch(0.68 0.16 55)" },
  onHold: { label: "On Hold", color: "oklch(0.55 0 0)" },
  complete: { label: "Complete", color: "oklch(0.62 0.16 145)" },
  cancelled: { label: "Cancelled", color: "oklch(0.52 0.15 25)" },
} satisfies ChartConfig

// ─── Component ────────────────────────────────────────────────────────────────

interface TaskStatusPieChartProps {
  tasks: TaskRow[]
}

export function TaskStatusPieChart({ tasks }: TaskStatusPieChartProps) {
  const id = "pie-task-status"

  const statusData = React.useMemo(() => {
    const counts: Partial<Record<TaskStatus, number>> = {}
    for (const task of tasks) {
      counts[task.status] = (counts[task.status] ?? 0) + 1
    }
    return (Object.entries(counts) as [TaskStatus, number][])
      .filter(([, n]) => n > 0)
      .map(([status, count]) => {
        const key = STATUS_KEY_MAP[status]
        return {
          status: key,
          label: status,
          count,
          fill: `var(--color-${key})`,
        }
      })
  }, [tasks])

  const [activeStatus, setActiveStatus] = React.useState<string>(
    statusData[0]?.status ?? "todo"
  )

  React.useEffect(() => {
    if (
      statusData.length > 0 &&
      !statusData.find((d) => d.status === activeStatus)
    ) {
      setActiveStatus(statusData[0].status)
    }
  }, [statusData, activeStatus])

  const activeIndex = React.useMemo(
    () => statusData.findIndex((d) => d.status === activeStatus),
    [activeStatus, statusData]
  )

  const renderPieShape = React.useCallback(
    ({ index, outerRadius = 0, ...props }: PieSectorShapeProps) => {
      if (index === activeIndex) {
        return (
          <g>
            <Sector {...props} outerRadius={outerRadius + 10} />
            <Sector
              {...props}
              outerRadius={outerRadius + 25}
              innerRadius={outerRadius + 12}
            />
          </g>
        )
      }
      return <Sector {...props} outerRadius={outerRadius} />
    },
    [activeIndex]
  )

  const activeItem = statusData[activeIndex]

  return (
    <Card data-chart={id} className="flex flex-col">
      <ChartStyle id={id} config={chartConfig} />
      <CardHeader className="flex-row items-start space-y-0 pb-0">
        <div className="grid gap-1">
          <CardTitle>Task Status</CardTitle>
          <CardDescription>Distribution by status</CardDescription>
        </div>
        <Select value={activeStatus} onValueChange={setActiveStatus}>
          <SelectTrigger
            className="ml-auto h-7 w-[150px] rounded-lg pl-2.5"
            aria-label="Select a status"
          >
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent align="end" className="rounded-xl">
            {statusData.map((item) => {
              const config =
                chartConfig[item.status as keyof typeof chartConfig]
              if (!config) return null
              return (
                <SelectItem
                  key={item.status}
                  value={item.status}
                  className="rounded-lg [&_span]:flex"
                >
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className="flex h-3 w-3 shrink-0 rounded-xs"
                      style={{ backgroundColor: `var(--color-${item.status})` }}
                    />
                    {"label" in config ? config.label : item.status}
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="flex flex-1 justify-center pb-0">
        <ChartContainer
          id={id}
          config={chartConfig}
          className="mx-auto aspect-square w-full max-w-[300px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={statusData}
              dataKey="count"
              nameKey="status"
              innerRadius={60}
              strokeWidth={5}
              shape={renderPieShape}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {activeItem?.count ?? 0}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          {activeItem?.label ?? ""}
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
