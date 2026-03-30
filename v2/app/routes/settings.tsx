import * as React from "react"
import {
  redirect,
  useLoaderData,
  useRevalidator,
  type ClientLoaderFunctionArgs,
} from "react-router"
import { toast } from "sonner"
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
import { Button } from "~/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { ScrollArea } from "~/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { Separator } from "~/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar"
import {
  IconCopy,
  IconCheck,
  IconUserPlus,
  IconTrash,
  IconLink,
  IconX,
} from "@tabler/icons-react"
import { AppSidebar } from "~/components/app-sidebar"
import { supabase } from "~/lib/supabase"
import { resolveWorkspaceId } from "~/lib/activeWorkspace"
import { invokeAuthedFunction } from "~/lib/invokeAuthedFunction"

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkspaceMember {
  user_id: string
  email: string
  full_name?: string | null
  role?: string | null
}

interface ProjectOption {
  id: string
  name: string
}

interface InviteClientResponse {
  ok: boolean
  warning?: string
  magicLink?: string
  magic_link?: string
}

// ─── Loader ───────────────────────────────────────────────────────────────────

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

  if (!activeWorkspaceId) {
    return {
      members: [] as WorkspaceMember[],
      projects: [] as ProjectOption[],
      inboxUnreadCount: 0,
      activityUnreadCount: 0,
      workspaces,
      user,
      activeWorkspaceId,
      isAdmin: false,
      currentUserRole: null as string | null,
    }
  }

  const [membersResult, projectsResult, inboxResult, activityResult] =
    await Promise.all([
      supabase.rpc("get_workspace_users_with_emails", {
        workspace_id_param: activeWorkspaceId,
      }),
      supabase
        .from("projects")
        .select("id, name")
        .eq("workspace_id", activeWorkspaceId)
        .order("name", { ascending: true }),
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
    ])

  const members = (membersResult.data ?? []) as WorkspaceMember[]
  const currentMember = members.find((m) => m.user_id === session.user.id)
  const currentUserRole = currentMember?.role ?? null
  const isAdmin = currentUserRole === "admin"

  if (currentUserRole === "viewer") {
    return redirect(`/sprint-dashboard?ws=${activeWorkspaceId}`)
  }

  return {
    members,
    projects: (projectsResult.data ?? []) as ProjectOption[],
    inboxUnreadCount: inboxResult.count ?? 0,
    activityUnreadCount: activityResult.count ?? 0,
    workspaces,
    user,
    activeWorkspaceId,
    isAdmin,
    currentUserRole,
  }
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="shrink-0 gap-1.5"
      onClick={handleCopy}
    >
      {copied ? (
        <IconCheck className="size-3.5 text-green-500" />
      ) : (
        <IconCopy className="size-3.5" />
      )}
      {copied ? "Copied" : "Copy"}
    </Button>
  )
}

// ─── Role badge ───────────────────────────────────────────────────────────────

const roleBadgeVariant: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  admin: "default",
  member: "secondary",
  client: "outline",
  viewer: "outline",
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const {
    members,
    projects,
    inboxUnreadCount,
    activityUnreadCount,
    workspaces,
    user,
    activeWorkspaceId,
    isAdmin,
    currentUserRole,
  } = useLoaderData<typeof clientLoader>()

  const { revalidate } = useRevalidator()
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId)

  // ── Invite form state ──────────────────────────────────────────────────────
  const [email, setEmail] = React.useState("")
  const [firstName, setFirstName] = React.useState("")
  const [surname, setSurname] = React.useState("")
  const [role, setRole] = React.useState("member")
  const [scope, setScope] = React.useState<"workspace" | "project">("workspace")
  const [projectId, setProjectId] = React.useState("__none__")
  const [submitting, setSubmitting] = React.useState(false)
  const [magicLink, setMagicLink] = React.useState<string | null>(null)
  const [removingUserId, setRemovingUserId] = React.useState<string | null>(
    null
  )
  const [regeneratingLinkFor, setRegeneratingLinkFor] = React.useState<
    string | null
  >(null)
  const [updatingRoleFor, setUpdatingRoleFor] = React.useState<string | null>(
    null
  )
  const [roleDrafts, setRoleDrafts] = React.useState<Record<string, string>>({})
  const [memberLinks, setMemberLinks] = React.useState<Record<string, string>>(
    {}
  )
  const [activeTab, setActiveTab] = React.useState<"team" | "invite">("team")

  React.useEffect(() => {
    const nextDrafts: Record<string, string> = {}
    members.forEach((m) => {
      nextDrafts[m.user_id] = m.role ?? "viewer"
    })
    setRoleDrafts(nextDrafts)
  }, [members])

  const activeTabLabel = activeTab === "team" ? "Team" : "Invite"

  async function handleRoleUpdate(userId: string, nextRole: string) {
    if (!activeWorkspaceId || !isAdmin) return
    setUpdatingRoleFor(userId)

    const { error } = await supabase
      .from("workspace_users")
      .update({ role: nextRole })
      .eq("workspace_id", activeWorkspaceId)
      .eq("user_id", userId)

    setUpdatingRoleFor(null)
    if (error) {
      toast.error("Failed to update role", { description: error.message })
      return
    }

    toast.success("User role updated")
    setRoleDrafts((prev) => ({ ...prev, [userId]: nextRole }))
    revalidate()
  }

  async function handleRegenerateLink(member: WorkspaceMember) {
    if (!activeWorkspaceId) return
    setRegeneratingLinkFor(member.user_id)
    try {
      const result = await invokeAuthedFunction<InviteClientResponse>(
        "invite-client",
        {
          workspaceId: activeWorkspaceId,
          email: member.email,
          role: member.role ?? "viewer",
          delivery: "magic_link",
          workspaceName: activeWorkspace?.name ?? "",
        }
      )
      const returnedLink = result.magicLink ?? result.magic_link ?? null
      if (returnedLink) {
        setMemberLinks((prev) => ({
          ...prev,
          [member.user_id]: returnedLink,
        }))
      } else {
        toast.error("No magic link returned")
      }
    } catch (err) {
      toast.error("Failed to generate link", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setRegeneratingLinkFor(null)
    }
  }

  async function handleRemove(userId: string) {
    if (!activeWorkspaceId) return
    setRemovingUserId(userId)
    const { error } = await supabase
      .from("workspace_users")
      .delete()
      .eq("workspace_id", activeWorkspaceId)
      .eq("user_id", userId)
    setRemovingUserId(null)
    if (error) {
      toast.error("Failed to remove user", { description: error.message })
    } else {
      toast.success("User removed")
      revalidate()
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !activeWorkspaceId) return
    setSubmitting(true)
    setMagicLink(null)

    const body: Record<string, unknown> = {
      workspaceId: activeWorkspaceId,
      email: email.trim(),
      role,
      firstName: firstName.trim(),
      surname: surname.trim(),
      delivery: "magic_link",
      workspaceName: activeWorkspace?.name ?? "",
    }
    if (scope === "project" && projectId !== "__none__") {
      body.projectId = projectId
    }

    try {
      const result = await invokeAuthedFunction<InviteClientResponse>(
        "invite-client",
        body
      )
      const returnedLink = result.magicLink ?? result.magic_link ?? null
      if (!returnedLink) {
        throw new Error("No magic link returned")
      }
      toast.success("Magic link generated")
      setMagicLink(returnedLink)
      setEmail("")
      setFirstName("")
      setSurname("")
      revalidate()
    } catch (err) {
      toast.error("Invite failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setSubmitting(false)
    }
  }

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
          {/* Header */}
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/settings">Settings</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{activeTabLabel}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto">
              <ModeToggle />
            </div>
          </header>

          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "team" | "invite")}
            className="flex flex-1 overflow-hidden"
          >
            <div className="hidden w-56 shrink-0 border-r p-3 md:block">
              <TabsList className="h-auto w-full flex-col items-stretch gap-1 bg-transparent p-0">
                <TabsTrigger value="team" className="w-full justify-start">
                  Team
                </TabsTrigger>
                <TabsTrigger value="invite" className="w-full justify-start">
                  Invite
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex flex-1 overflow-hidden">
              <ScrollArea className="flex-1">
                <div className="mx-auto max-w-3xl p-6">
                  <TabsList className="mb-4 grid w-full grid-cols-2 md:hidden">
                    <TabsTrigger value="team">Team</TabsTrigger>
                    <TabsTrigger value="invite">Invite</TabsTrigger>
                  </TabsList>

                  <TabsContent
                    value="team"
                    forceMount
                    className="mt-0 space-y-3"
                  >
                    <section className="space-y-3">
                      <h2 className="text-sm font-semibold">
                        Workspace Members{" "}
                        <span className="text-muted-foreground">
                          ({members.length})
                        </span>
                      </h2>
                      <div className="divide-y rounded-lg border">
                        {members.length === 0 ? (
                          <p className="p-4 text-sm text-muted-foreground">
                            No members yet.
                          </p>
                        ) : (
                          members.map((m) => {
                            const isSelf = m.email === user.email
                            const memberLink = memberLinks[m.user_id]
                            const currentRole = m.role ?? "viewer"
                            const selectedRole =
                              roleDrafts[m.user_id] ?? currentRole
                            const roleDirty = selectedRole !== currentRole
                            return (
                              <div key={m.user_id} className="flex flex-col">
                                <div className="flex items-center justify-between gap-4 px-4 py-3">
                                  <div className="min-w-0 flex-1">
                                    {m.full_name && (
                                      <p className="truncate text-sm font-medium">
                                        {m.full_name}
                                      </p>
                                    )}
                                    <p className="truncate text-xs text-muted-foreground">
                                      {m.email}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {isAdmin ? (
                                      <>
                                        <Select
                                          value={selectedRole}
                                          onValueChange={(value) =>
                                            setRoleDrafts((prev) => ({
                                              ...prev,
                                              [m.user_id]: value,
                                            }))
                                          }
                                          disabled={
                                            updatingRoleFor === m.user_id
                                          }
                                        >
                                          <SelectTrigger className="h-8 w-32.5 capitalize">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="admin">
                                              Admin
                                            </SelectItem>
                                            <SelectItem value="member">
                                              Member
                                            </SelectItem>
                                            <SelectItem value="client">
                                              Client
                                            </SelectItem>
                                            <SelectItem value="viewer">
                                              Viewer
                                            </SelectItem>
                                          </SelectContent>
                                        </Select>

                                        {roleDirty && (
                                          <>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="h-8"
                                              disabled={
                                                updatingRoleFor === m.user_id
                                              }
                                              onClick={() =>
                                                setRoleDrafts((prev) => ({
                                                  ...prev,
                                                  [m.user_id]: currentRole,
                                                }))
                                              }
                                            >
                                              Cancel
                                            </Button>
                                            <Button
                                              size="sm"
                                              className="h-8"
                                              disabled={
                                                updatingRoleFor === m.user_id
                                              }
                                              onClick={() =>
                                                void handleRoleUpdate(
                                                  m.user_id,
                                                  selectedRole
                                                )
                                              }
                                            >
                                              {updatingRoleFor === m.user_id
                                                ? "Saving..."
                                                : "Save"}
                                            </Button>
                                          </>
                                        )}
                                      </>
                                    ) : (
                                      <Badge
                                        variant={
                                          roleBadgeVariant[
                                            m.role ?? "viewer"
                                          ] ?? "outline"
                                        }
                                        className="shrink-0 capitalize"
                                      >
                                        {m.role ?? "viewer"}
                                      </Badge>
                                    )}
                                    {isAdmin && !isSelf && (
                                      <>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="size-7 text-muted-foreground hover:text-primary"
                                          disabled={
                                            regeneratingLinkFor === m.user_id
                                          }
                                          onClick={() =>
                                            handleRegenerateLink(m)
                                          }
                                          aria-label={`Generate link for ${m.email}`}
                                        >
                                          <IconLink className="size-3.5" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="size-7 text-muted-foreground hover:text-destructive"
                                          disabled={
                                            removingUserId === m.user_id
                                          }
                                          onClick={() =>
                                            handleRemove(m.user_id)
                                          }
                                          aria-label={`Remove ${m.email}`}
                                        >
                                          <IconTrash className="size-3.5" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                                {memberLink && (
                                  <div className="mx-4 mb-3 flex items-start gap-2 rounded-md border border-green-500/30 bg-green-500/5 px-3 py-2">
                                    <code className="flex-1 text-xs leading-relaxed break-all">
                                      {memberLink}
                                    </code>
                                    <div className="flex shrink-0 items-center gap-1">
                                      <CopyButton text={memberLink} />
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="size-7"
                                        onClick={() =>
                                          setMemberLinks((prev) => {
                                            const next = { ...prev }
                                            delete next[m.user_id]
                                            return next
                                          })
                                        }
                                        aria-label="Dismiss"
                                      >
                                        <IconX className="size-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })
                        )}
                      </div>
                    </section>
                  </TabsContent>

                  <TabsContent
                    value="invite"
                    forceMount
                    className="mt-0 space-y-4"
                  >
                    {isAdmin ? (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <IconUserPlus className="size-4 text-muted-foreground" />
                            Invite Team
                          </CardTitle>
                          <CardDescription>
                            Add members to your workspace
                          </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-4">
                          <form
                            id="invite-user-form"
                            onSubmit={handleInvite}
                            className="space-y-4"
                          >
                            <div className="flex items-center gap-2">
                              <Input
                                id="inv-email"
                                type="email"
                                placeholder="jane@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="flex-1"
                              />
                              <Select value={role} onValueChange={setRole}>
                                <SelectTrigger className="w-28">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="member">Member</SelectItem>
                                  <SelectItem value="client">Client</SelectItem>
                                  <SelectItem value="viewer">
                                    Viewer (read-only)
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <div className="grid gap-1.5">
                                <Label htmlFor="inv-first">First name</Label>
                                <Input
                                  id="inv-first"
                                  placeholder="Jane"
                                  value={firstName}
                                  onChange={(e) => setFirstName(e.target.value)}
                                />
                              </div>
                              <div className="grid gap-1.5">
                                <Label htmlFor="inv-surname">Surname</Label>
                                <Input
                                  id="inv-surname"
                                  placeholder="Smith"
                                  value={surname}
                                  onChange={(e) => setSurname(e.target.value)}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <div className="grid gap-1.5">
                                <Label>Access scope</Label>
                                <Select
                                  value={scope}
                                  onValueChange={(v) =>
                                    setScope(v as "workspace" | "project")
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="workspace">
                                      Workspace
                                    </SelectItem>
                                    <SelectItem value="project">
                                      Project only
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {scope === "project" ? (
                                <div className="grid gap-1.5">
                                  <Label>Project</Label>
                                  <Select
                                    value={projectId}
                                    onValueChange={setProjectId}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a project…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {projects.length === 0 ? (
                                        <SelectItem value="__none__" disabled>
                                          No projects yet
                                        </SelectItem>
                                      ) : (
                                        projects.map((p) => (
                                          <SelectItem key={p.id} value={p.id}>
                                            {p.name}
                                          </SelectItem>
                                        ))
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>
                              ) : (
                                <div className="grid gap-1.5">
                                  <Label className="invisible">Project</Label>
                                  <Input
                                    disabled
                                    value="All projects in workspace"
                                  />
                                </div>
                              )}
                            </div>
                          </form>

                          {magicLink && (
                            <>
                              <Separator />
                              <div className="space-y-2">
                                <Label htmlFor="invite-link">
                                  Or share invite link
                                </Label>
                                <div className="flex items-center gap-2">
                                  <Input
                                    id="invite-link"
                                    value={magicLink}
                                    readOnly
                                  />
                                  <CopyButton text={magicLink} />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Expires in 24 hours. The user signs in
                                  instantly — no password required.
                                </p>
                              </div>
                            </>
                          )}
                        </CardContent>

                        <CardFooter>
                          <Button
                            type="submit"
                            form="invite-user-form"
                            disabled={
                              submitting ||
                              !email.trim() ||
                              (scope === "project" && projectId === "__none__")
                            }
                            className="w-full"
                          >
                            {submitting
                              ? "Adding…"
                              : "Add User & Generate Link"}
                          </Button>
                        </CardFooter>
                      </Card>
                    ) : (
                      <div className="rounded-lg border p-6 text-sm text-muted-foreground">
                        Only workspace admins can invite users.
                      </div>
                    )}
                  </TabsContent>
                </div>
              </ScrollArea>
            </div>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
