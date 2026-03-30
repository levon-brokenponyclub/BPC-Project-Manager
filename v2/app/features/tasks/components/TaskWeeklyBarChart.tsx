"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "~/components/ui/chart"
import type { TaskRow } from "../types"

// ─── Config ───────────────────────────────────────────────────────────────────

const chartConfig = {
  views: { label: "Tasks" },
  thisWeek: { label: "This Week", color: "var(--chart-2)" },
  lastWeek: { label: "Last Week", color: "var(--chart-1)" },
} satisfies ChartConfig

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const

/** Returns the Monday of the week containing `date` (local time). */
function getMondayOf(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() // 0=Sun
  const diff = day === 0 ? -6 : 1 - day
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + diff)
  return d
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

// ─── Component ────────────────────────────────────────────────────────────────

interface TaskWeeklyBarChartProps {
  tasks: TaskRow[]
}

export function TaskWeeklyBarChart({ tasks }: TaskWeeklyBarChartProps) {
  const chartData = React.useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const thisMonday = getMondayOf(today)
    const lastMonday = new Date(thisMonday)
    lastMonday.setDate(lastMonday.getDate() - 7)

    // Build date-key → day-index maps for each week
    const thisDates: string[] = []
    const lastDates: string[] = []
    for (let i = 0; i < 7; i++) {
      const t = new Date(thisMonday)
      t.setDate(t.getDate() + i)
      thisDates.push(toDateKey(t))

      const l = new Date(lastMonday)
      l.setDate(l.getDate() + i)
      lastDates.push(toDateKey(l))
    }

    const thisWeekCounts = [0, 0, 0, 0, 0, 0, 0]
    const lastWeekCounts = [0, 0, 0, 0, 0, 0, 0]

    for (const task of tasks) {
      const created = task.created_at.slice(0, 10)
      const ti = thisDates.indexOf(created)
      if (ti !== -1) thisWeekCounts[ti]++
      const li = lastDates.indexOf(created)
      if (li !== -1) lastWeekCounts[li]++
    }

    return DAY_NAMES.map((day, i) => ({
      day,
      thisWeekLabel: thisDates[i],
      lastWeekLabel: lastDates[i],
      thisWeek: thisWeekCounts[i],
      lastWeek: lastWeekCounts[i],
    }))
  }, [tasks])

  const [activeChart, setActiveChart] = React.useState<"thisWeek" | "lastWeek">(
    "thisWeek"
  )

  const total = React.useMemo(
    () => ({
      thisWeek: chartData.reduce((acc, d) => acc + d.thisWeek, 0),
      lastWeek: chartData.reduce((acc, d) => acc + d.lastWeek, 0),
    }),
    [chartData]
  )

  return (
    <Card className="py-0">
      <CardHeader className="flex flex-col items-stretch border-b p-0! sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:py-0!">
          <CardTitle>Task Activity</CardTitle>
          <CardDescription>Tasks created per day</CardDescription>
        </div>
        <div className="flex">
          {(["thisWeek", "lastWeek"] as const).map((key) => (
            <button
              key={key}
              data-active={activeChart === key}
              className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
              onClick={() => setActiveChart(key)}
            >
              <span className="text-xs text-muted-foreground">
                {chartConfig[key].label}
              </span>
              <span className="text-lg leading-none font-bold sm:text-3xl">
                {total[key].toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{ left: 12, right: 12 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[150px]"
                  nameKey="views"
                  labelFormatter={(value) => {
                    const row = chartData.find((d) => d.day === value)
                    const dateKey =
                      activeChart === "thisWeek"
                        ? row?.thisWeekLabel
                        : row?.lastWeekLabel
                    if (!dateKey) return value
                    return new Date(dateKey + "T00:00:00").toLocaleDateString(
                      "en-GB",
                      { day: "numeric", month: "short", year: "numeric" }
                    )
                  }}
                />
              }
            />
            <Bar
              dataKey={activeChart}
              fill={`var(--color-${activeChart})`}
              radius={4}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
