import * as React from "react"
import {
  redirect,
  useLoaderData,
  type ClientLoaderFunctionArgs,
} from "react-router"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Pie,
  PieChart,
  ReferenceLine,
  XAxis,
} from "recharts"
import { ModeToggle } from "~/components/mode-toggle"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb"
import { Badge } from "~/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "~/components/ui/chart"
import { Separator } from "~/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar"
import { AppSidebar } from "~/components/app-sidebar"
import { supabase } from "~/lib/supabase"
import { resolveWorkspaceId } from "~/lib/activeWorkspace"

// ========================
// CONSTANTS
// ========================

const TOTAL_SITES = 52
const BASELINE_MIN = 37
const TOTAL_HOURS_EST = 33

const SPRINT_DAYS = [
  { day: 1, date: "2026-03-31", label: "Mar 31", planned: 4 },
  { day: 2, date: "2026-04-01", label: "Apr 1", planned: 9 },
  { day: 3, date: "2026-04-02", label: "Apr 2", planned: 13 },
  { day: 4, date: "2026-04-03", label: "Apr 3", planned: 18 },
  { day: 5, date: "2026-04-06", label: "Apr 6", planned: 22 },
  { day: 6, date: "2026-04-07", label: "Apr 7", planned: 27 },
  { day: 7, date: "2026-04-08", label: "Apr 8", planned: 31 },
  { day: 8, date: "2026-04-09", label: "Apr 9", planned: 36 },
  { day: 9, date: "2026-04-10", label: "Apr 10", planned: 41 },
  { day: 10, date: "2026-04-13", label: "Apr 13", planned: 46 },
  { day: 11, date: "2026-04-14", label: "Apr 14", planned: 52 },
] as const

// ========================
// TYPES
// ========================

interface SiteMeta {
  url: string
  env: "Production" | "WP Engine" | "Flywheel"
  phase: "Phase 1" | "Phase 2" | "Phase 3"
  risk: "Open" | "Closed"
  baseline_min: number
}

interface SprintTask {
  id: string
  title: string
  status: string
  due_date: string | null
  completed_at: string | null
  meta: SiteMeta
  timeSpentSeconds: number
}

// ========================
// HELPERS
// ========================

function parseMeta(description: string | null): SiteMeta | null {
  if (!description) return null
  try {
    const m = JSON.parse(description)
    if (!m || m.workstream || !m.url) return null
    return m as SiteMeta
  } catch {
    return null
  }
}

// ========================
// CHART CONFIGS
// ========================

const progressConfig = {
  planned: { label: "Planned", color: "var(--chart-1)" },
  actual: { label: "Actual", color: "var(--chart-2)" },
} satisfies ChartConfig

const completionConfig = {
  Completed: { label: "Completed", color: "var(--chart-2)" },
  Remaining: { label: "Remaining", color: "oklch(0.55 0 0)" },
} satisfies ChartConfig

const envConfig = {
  completed: { label: "Completed", color: "var(--chart-2)" },
  remaining: { label: "Remaining", color: "var(--chart-1)" },
} satisfies ChartConfig

const hoursConfig = {
  hours: { label: "Hours Logged", color: "var(--chart-1)" },
} satisfies ChartConfig

const avgTimeConfig = {
  avg: { label: "Avg Min / Site", color: "var(--chart-2)" },
} satisfies ChartConfig

// ========================
// LOADER
// ========================

export async function clientLoader({ request }: ClientLoaderFunctionArgs) {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return redirect("/login")

  const { data: wsRows } = await supabase
    .from("my_workspaces")
    .select("id,name")
    .order("name", { ascending: true })
  const workspaces = (wsRows ?? []) as { id: string; name: string }[]

  const url = new URL(request.url)
  const wsParam = url.searchParams.get("ws")
  const activeWorkspaceId = resolveWorkspaceId(wsParam, workspaces)

  const user = {
    name: session.user.user_metadata?.full_name ?? session.user.email ?? "",
    email: session.user.email ?? "",
    avatar: session.user.user_metadata?.avatar_url ?? "",
  }

  const MESSAGE_TYPES = ["message.direct", "message.reply", "message.mention"]

  const emptyProgressData = SPRINT_DAYS.map((d) => ({
    ...d,
    actual: null as number | null,
  }))

  const emptyReturn = {
    apacProject: null as { id: string; name: string } | null,
    siteTasks: [] as SprintTask[],
    kpis: {
      sitesCompleted: 0,
      sitesRemaining: TOTAL_SITES,
      totalTimeHours: 0,
      avgTimeMinutes: 0,
    },
    progressChartData: emptyProgressData,
    envChartData: [
      { env: "Production", completed: 0, remaining: 36 },
      { env: "Development", completed: 0, remaining: 16 },
    ],
    dailyHoursData: SPRINT_DAYS.map((d) => ({
      label: d.label,
      date: d.date,
      hours: 0,
    })),
    avgTimeTrendData: SPRINT_DAYS.map((d) => ({
      label: d.label,
      date: d.date,
      avg: null as number | null,
    })),
    workspaces,
    user,
    activeWorkspaceId,
    currentUserRole: null as string | null,
    inboxUnreadCount: 0,
    activityUnreadCount: 0,
  }

  if (!activeWorkspaceId) return emptyReturn

  const [projectResult, inboxResult, activityResult, membersResult] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id, name")
        .eq("workspace_id", activeWorkspaceId)
        .ilike("name", "%APAC%")
        .limit(1)
        .maybeSingle(),
      supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", activeWorkspaceId)
        .eq("user_id", session.user.id)
        .in("type", MESSAGE_TYPES)
        .is("read_at", null),
      supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", activeWorkspaceId)
        .eq("user_id", session.user.id)
        .not("type", "in", `(${MESSAGE_TYPES.join(",")})`)
        .is("read_at", null),
      supabase.rpc("get_workspace_users_with_emails", {
        workspace_id_param: activeWorkspaceId,
      }),
    ])

  const members = (membersResult.data ?? []) as {
    user_id: string
    role?: string | null
  }[]
  const currentUserRole =
    members.find((m) => m.user_id === session.user.id)?.role ?? null

  const inboxUnreadCount = inboxResult.count ?? 0
  const activityUnreadCount = activityResult.count ?? 0

  if (!projectResult.data) {
    return {
      ...emptyReturn,
      currentUserRole,
      inboxUnreadCount,
      activityUnreadCount,
    }
  }

  const apacProject = projectResult.data as { id: string; name: string }

  // All tasks in the APAC project
  const { data: rawTasks } = await supabase
    .from("tasks")
    .select("id, title, status, due_date, completed_at, description")
    .eq("workspace_id", activeWorkspaceId)
    .eq("project_id", apacProject.id)

  if (!rawTasks?.length) {
    return {
      ...emptyReturn,
      apacProject,
      currentUserRole,
      inboxUnreadCount,
      activityUnreadCount,
    }
  }

  type RawTask = {
    id: string
    title: string
    status: string
    due_date: string | null
    completed_at: string | null
    description: string | null
  }

  // Filter to site tasks (have url meta, not workstream markers)
  const siteRaw = (rawTasks as RawTask[]).filter(
    (t) => parseMeta(t.description) !== null
  )
  const siteTaskIds = siteRaw.map((t) => t.id)

  const { data: timeRows } = siteTaskIds.length
    ? await supabase
        .from("time_entries")
        .select("task_id, duration_seconds, created_at")
        .in("task_id", siteTaskIds)
    : {
        data: [] as {
          task_id: string
          duration_seconds: number
          created_at: string
        }[],
      }

  type TimeRow = {
    task_id: string
    duration_seconds: number
    created_at: string
  }
  const timeEntries = (timeRows ?? []) as TimeRow[]

  const timeMap = timeEntries.reduce<Record<string, number>>((acc, te) => {
    acc[te.task_id] = (acc[te.task_id] ?? 0) + (te.duration_seconds ?? 0)
    return acc
  }, {})

  const siteTasks: SprintTask[] = siteRaw.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    due_date: t.due_date,
    completed_at: t.completed_at,
    meta: parseMeta(t.description)!,
    timeSpentSeconds: timeMap[t.id] ?? 0,
  }))

  // ─── KPIs ───────────────────────────────────────────────────────────────────

  const completedTasks = siteTasks.filter((t) => t.status === "Complete")
  const sitesCompleted = completedTasks.length
  const sitesRemaining = TOTAL_SITES - sitesCompleted
  const totalTimeHours =
    siteTasks.reduce((s, t) => s + t.timeSpentSeconds, 0) / 3600
  const avgTimeMinutes =
    sitesCompleted > 0
      ? completedTasks.reduce((s, t) => s + t.timeSpentSeconds, 0) /
        sitesCompleted /
        60
      : 0

  // ─── Progress vs Plan ───────────────────────────────────────────────────────

  const completionsByDate = completedTasks.reduce<Record<string, number>>(
    (acc, t) => {
      const key = t.completed_at
        ? t.completed_at.slice(0, 10)
        : (t.due_date ?? "")
      if (key) acc[key] = (acc[key] ?? 0) + 1
      return acc
    },
    {}
  )

  const today = new Date().toISOString().slice(0, 10)
  let runningActual = 0
  const progressChartData = SPRINT_DAYS.map((d) => {
    runningActual += completionsByDate[d.date] ?? 0
    return {
      ...d,
      actual: d.date <= today ? runningActual : (null as number | null),
    }
  })

  // ─── Environment Breakdown ──────────────────────────────────────────────────

  const prodTasks = siteTasks.filter((t) => t.meta.env === "Production")
  const devTasks = siteTasks.filter((t) => t.meta.env !== "Production")
  const envChartData = [
    {
      env: "Production",
      completed: prodTasks.filter((t) => t.status === "Complete").length,
      remaining: prodTasks.filter((t) => t.status !== "Complete").length,
    },
    {
      env: "Development",
      completed: devTasks.filter((t) => t.status === "Complete").length,
      remaining: devTasks.filter((t) => t.status !== "Complete").length,
    },
  ]

  // ─── Daily Hours ────────────────────────────────────────────────────────────

  const hoursByDate = timeEntries.reduce<Record<string, number>>((acc, te) => {
    const date = te.created_at.slice(0, 10)
    acc[date] = (acc[date] ?? 0) + te.duration_seconds / 3600
    return acc
  }, {})

  const dailyHoursData = SPRINT_DAYS.map((d) => ({
    label: d.label,
    date: d.date,
    hours: Math.round((hoursByDate[d.date] ?? 0) * 100) / 100,
  }))

  // ─── Avg Time Trend ─────────────────────────────────────────────────────────

  const completedByDate = completedTasks.reduce<Record<string, number[]>>(
    (acc, t) => {
      const key = t.completed_at
        ? t.completed_at.slice(0, 10)
        : (t.due_date ?? "")
      if (!key) return acc
      ;(acc[key] = acc[key] ?? []).push(t.timeSpentSeconds / 60)
      return acc
    },
    {}
  )

  const avgTimeTrendData = SPRINT_DAYS.map((d) => ({
    label: d.label,
    date: d.date,
    avg: completedByDate[d.date]?.length
      ? Math.round(
          completedByDate[d.date].reduce((a, b) => a + b, 0) /
            completedByDate[d.date].length
        )
      : (null as number | null),
  }))

  return {
    apacProject,
    siteTasks,
    kpis: {
      sitesCompleted,
      sitesRemaining,
      totalTimeHours,
      avgTimeMinutes,
    },
    progressChartData,
    envChartData,
    dailyHoursData,
    avgTimeTrendData,
    workspaces,
    user,
    activeWorkspaceId,
    currentUserRole,
    inboxUnreadCount,
    activityUnreadCount,
  }
}

// ========================
// PAGE
// ========================

export default function SprintDashboardPage() {
  const {
    apacProject,
    kpis,
    progressChartData,
    envChartData,
    dailyHoursData,
    avgTimeTrendData,
    workspaces,
    user,
    activeWorkspaceId,
    currentUserRole,
    inboxUnreadCount,
    activityUnreadCount,
  } = useLoaderData<typeof clientLoader>()

  const completionData = [
    { name: "Completed", value: kpis.sitesCompleted },
    { name: "Remaining", value: kpis.sitesRemaining },
  ]
  const pct = Math.round((kpis.sitesCompleted / TOTAL_SITES) * 100)

  return (
    <SidebarProvider>
      <AppSidebar
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        user={user}
        currentUserRole={currentUserRole}
        inboxUnreadCount={inboxUnreadCount}
        activityUnreadCount={activityUnreadCount}
      />
      <SidebarInset className="overflow-hidden">
        <div className="flex h-full flex-col overflow-hidden">
          {/* ========================
              HEADER
          ======================== */}
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/projects">Projects</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>APAC Sprint Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto">
              <ModeToggle />
            </div>
          </header>

          {/* ========================
              CONTENT
          ======================== */}
          <div className="flex-1 space-y-6 overflow-auto p-6">
            {!apacProject ? (
              <div className="rounded-xl border p-6 text-sm text-muted-foreground">
                APAC project not found in this workspace. Run{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  seed_apac_sprint.sql
                </code>{" "}
                first.
              </div>
            ) : (
              <>
                {/* Programme title */}
                <div>
                  <h1 className="text-lg font-semibold">
                    APAC Web Fonts Remediation Sprint
                  </h1>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {apacProject.name} · 52 sites · 11 working days · Mar 31 –
                    Apr 14, 2026
                  </p>
                </div>

                {/* ========================
                    KPI CARDS
                ======================== */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <Card>
                    <CardHeader>
                      <CardDescription>Sites Completed</CardDescription>
                      <CardTitle className="text-3xl tabular-nums">
                        {kpis.sitesCompleted}
                      </CardTitle>
                      <CardAction>
                        <Badge variant="outline">of {TOTAL_SITES}</Badge>
                      </CardAction>
                    </CardHeader>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardDescription>Sites Remaining</CardDescription>
                      <CardTitle className="text-3xl tabular-nums">
                        {kpis.sitesRemaining}
                      </CardTitle>
                      <CardAction>
                        <Badge variant="secondary">to do</Badge>
                      </CardAction>
                    </CardHeader>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardDescription>Total Time Logged</CardDescription>
                      <CardTitle className="text-3xl tabular-nums">
                        {kpis.totalTimeHours.toFixed(1)}h
                      </CardTitle>
                      <CardAction>
                        <Badge variant="outline">
                          of {TOTAL_HOURS_EST}h est.
                        </Badge>
                      </CardAction>
                    </CardHeader>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardDescription>Avg Time / Site</CardDescription>
                      <CardTitle className="text-3xl tabular-nums">
                        {kpis.sitesCompleted > 0
                          ? `${Math.round(kpis.avgTimeMinutes)}m`
                          : "—"}
                      </CardTitle>
                      <CardAction>
                        <Badge variant="outline">
                          {BASELINE_MIN}m baseline
                        </Badge>
                      </CardAction>
                    </CardHeader>
                  </Card>
                </div>

                {/* ========================
                    CHARTS ROW 1
                    Progress vs Plan + Completion Split
                ======================== */}
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                  {/* Progress vs Plan */}
                  <Card className="pb-0 xl:col-span-2">
                    <CardHeader>
                      <CardTitle>Progress vs Plan</CardTitle>
                      <CardDescription>
                        Cumulative site completions — 11 working days
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-0 pb-4">
                      <ChartContainer
                        config={progressConfig}
                        className="h-52 w-full"
                      >
                        <AreaChart
                          data={progressChartData}
                          margin={{ left: 12, right: 12 }}
                        >
                          <CartesianGrid vertical={false} />
                          <XAxis
                            dataKey="label"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 11 }}
                          />
                          <ChartTooltip
                            content={<ChartTooltipContent indicator="line" />}
                          />
                          <ChartLegend content={<ChartLegendContent />} />
                          <Area
                            dataKey="planned"
                            type="monotone"
                            fill="var(--color-planned)"
                            stroke="var(--color-planned)"
                            fillOpacity={0.15}
                            strokeWidth={2}
                            dot={false}
                          />
                          <Area
                            dataKey="actual"
                            type="monotone"
                            fill="var(--color-actual)"
                            stroke="var(--color-actual)"
                            fillOpacity={0.35}
                            strokeWidth={2}
                            dot={false}
                            connectNulls={false}
                          />
                        </AreaChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  {/* Completion Split */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Completion Split</CardTitle>
                      <CardDescription>Completed vs Remaining</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer
                        config={completionConfig}
                        className="mx-auto aspect-square max-h-50"
                      >
                        <PieChart>
                          <ChartTooltip
                            content={<ChartTooltipContent hideLabel />}
                          />
                          <Pie
                            data={completionData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={55}
                            strokeWidth={3}
                          >
                            <Cell fill="var(--color-Completed)" />
                            <Cell fill="var(--color-Remaining)" />
                            <Label
                              content={({ viewBox }) => {
                                if (!viewBox || !("cx" in viewBox)) return null
                                const { cx, cy } = viewBox as {
                                  cx: number
                                  cy: number
                                }
                                return (
                                  <text
                                    x={cx}
                                    y={cy}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                  >
                                    <tspan
                                      x={cx}
                                      y={cy}
                                      className="fill-foreground text-2xl font-bold"
                                    >
                                      {pct}%
                                    </tspan>
                                    <tspan
                                      x={cx}
                                      y={cy + 18}
                                      className="fill-muted-foreground text-xs"
                                    >
                                      done
                                    </tspan>
                                  </text>
                                )
                              }}
                            />
                          </Pie>
                        </PieChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* ========================
                    CHARTS ROW 2
                    Environment + Daily Hours
                ======================== */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* Environment Breakdown */}
                  <Card className="pb-0">
                    <CardHeader>
                      <CardTitle>Environment Breakdown</CardTitle>
                      <CardDescription>
                        Production (36) vs Development (16)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-0 pb-4">
                      <ChartContainer
                        config={envConfig}
                        className="h-44 w-full"
                      >
                        <BarChart
                          data={envChartData}
                          margin={{ left: 12, right: 12 }}
                        >
                          <CartesianGrid vertical={false} />
                          <XAxis
                            dataKey="env"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 12 }}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <ChartLegend content={<ChartLegendContent />} />
                          <Bar
                            dataKey="completed"
                            fill="var(--color-completed)"
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar
                            dataKey="remaining"
                            fill="var(--color-remaining)"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  {/* Daily Hours Logged */}
                  <Card className="pb-0">
                    <CardHeader>
                      <CardTitle>Daily Hours Logged</CardTitle>
                      <CardDescription>
                        Target 3 hrs/day (dashed line)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-0 pb-4">
                      <ChartContainer
                        config={hoursConfig}
                        className="h-44 w-full"
                      >
                        <BarChart
                          data={dailyHoursData}
                          margin={{ left: 12, right: 12 }}
                        >
                          <CartesianGrid vertical={false} />
                          <XAxis
                            dataKey="label"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 11 }}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <ReferenceLine
                            y={3}
                            stroke="oklch(0.55 0 0)"
                            strokeDasharray="4 4"
                          />
                          <Bar
                            dataKey="hours"
                            fill="var(--color-hours)"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* ========================
                    CHART ROW 3
                    Avg Time per Site Trend
                ======================== */}
                <Card className="pb-0">
                  <CardHeader>
                    <CardTitle>Avg Time per Site Trend</CardTitle>
                    <CardDescription>
                      Minutes per completed site vs {BASELINE_MIN} min baseline
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-0 pb-4">
                    <ChartContainer
                      config={avgTimeConfig}
                      className="h-48 w-full"
                    >
                      <AreaChart
                        data={avgTimeTrendData}
                        margin={{ left: 12, right: 12 }}
                      >
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="label"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11 }}
                        />
                        <ChartTooltip
                          content={<ChartTooltipContent indicator="line" />}
                        />
                        <ChartLegend content={<ChartLegendContent />} />
                        <ReferenceLine
                          y={BASELINE_MIN}
                          stroke="oklch(0.55 0 0)"
                          strokeDasharray="4 4"
                          label={{
                            value: `${BASELINE_MIN}m baseline`,
                            position: "insideTopRight",
                            fontSize: 11,
                            fill: "oklch(0.55 0 0)",
                          }}
                        />
                        <Area
                          dataKey="avg"
                          type="monotone"
                          fill="var(--color-avg)"
                          stroke="var(--color-avg)"
                          fillOpacity={0.3}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          connectNulls={false}
                        />
                      </AreaChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
