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
  IconTrash,
  IconLink,
  IconX,
  IconDotsVertical,
  IconAlertTriangle,
  IconUser,
} from "@tabler/icons-react"
import { CameraIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from "~/components/ui/avatar"
import { AppSidebar } from "~/components/app-sidebar"
import { supabase } from "~/lib/supabase"
import { resolveWorkspaceId } from "~/lib/activeWorkspace"
import { invokeAuthedFunction } from "~/lib/invokeAuthedFunction"

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkspaceMember {
  user_id: string
  email: string
  full_name?: string | null
  first_name?: string | null
  surname?: string | null
  avatar_url?: string | null
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

interface MagicLinkEntry {
  url: string
  generatedAt: number
}

// 55 min — 5 min buffer before Supabase's 1 h default expiry
const LINK_EXPIRY_MS = 55 * 60 * 1_000

function isLinkExpired(entry: MagicLinkEntry): boolean {
  return Date.now() - entry.generatedAt > LINK_EXPIRY_MS
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
  const [selectedWsId, setSelectedWsId] = React.useState<string>(
    activeWorkspaceId ?? "__none__"
  )
  const [projectId, setProjectId] = React.useState("__none__")
  const [submitting, setSubmitting] = React.useState(false)
  const [magicLink, setMagicLink] = React.useState<MagicLinkEntry | null>(null)
  const [removingUserId, setRemovingUserId] = React.useState<string | null>(
    null
  )
  const [regeneratingLinkFor, setRegeneratingLinkFor] = React.useState<
    string | null
  >(null)
  const [updatingRoleFor, setUpdatingRoleFor] = React.useState<string | null>(
    null
  )
  const [editingMember, setEditingMember] =
    React.useState<WorkspaceMember | null>(null)
  const [editRoleDraft, setEditRoleDraft] = React.useState<string>("member")

  // ── Edit profile (admin) ──────────────────────────────────────────────────
  const [profileEditTarget, setProfileEditTarget] =
    React.useState<WorkspaceMember | null>(null)
  const [profileFirstName, setProfileFirstName] = React.useState("")
  const [profileSurname, setProfileSurname] = React.useState("")
  const [profileAvatarUrl, setProfileAvatarUrl] = React.useState("")
  const [profileUploading, setProfileUploading] = React.useState(false)
  const [profileSaving, setProfileSaving] = React.useState(false)

  function openProfileEdit(m: WorkspaceMember) {
    setProfileEditTarget(m)
    setProfileFirstName(m.first_name ?? m.full_name?.split(" ")[0] ?? "")
    setProfileSurname(
      m.surname ?? m.full_name?.split(" ").slice(1).join(" ") ?? ""
    )
    setProfileAvatarUrl(m.avatar_url ?? "")
  }

  async function handleProfileAvatarUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0]
    if (!file || !profileEditTarget) return
    setProfileUploading(true)
    try {
      const ext = file.name.split(".").pop() ?? "png"
      const path = `${profileEditTarget.user_id}/${Date.now()}.${ext}`
      const { data, error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type })
      if (error) throw error
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(data.path)
      setProfileAvatarUrl(publicUrl)
    } catch (err) {
      toast.error("Upload failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setProfileUploading(false)
    }
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    if (!profileEditTarget || !activeWorkspaceId) return
    setProfileSaving(true)
    try {
      await invokeAuthedFunction("admin-users", {
        action: "update_profile",
        workspaceId: activeWorkspaceId,
        userId: profileEditTarget.user_id,
        email: profileEditTarget.email,
        firstName: profileFirstName,
        surname: profileSurname,
        avatarUrl: profileAvatarUrl,
      })
      toast.success("Profile updated")
      setProfileEditTarget(null)
      revalidate()
    } catch (err) {
      toast.error("Failed to update profile", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setProfileSaving(false)
    }
  }
  const [memberLinks, setMemberLinks] = React.useState<
    Record<string, MagicLinkEntry>
  >({})
  const [showLinkFor, setShowLinkFor] = React.useState<Set<string>>(new Set())
  const [teamCardTab, setTeamCardTab] = React.useState<"members" | "invite">(
    "members"
  )
  const [activeTab, setActiveTab] = React.useState<
    "teams" | "billing" | "notifications" | "account" | "admin-tools"
  >("teams")

  const activeTabLabelMap: Record<typeof activeTab, string> = {
    teams: "Teams",
    billing: "Billing",
    notifications: "Notifications",
    account: "Account",
    "admin-tools": "Admin Tools",
  }
  const activeTabLabel = activeTabLabelMap[activeTab]
  const visibleMembers = members.filter(
    (member) => member.email.toLowerCase() !== "levongravett@gmail.com"
  )
  const hasVisibleMembers = visibleMembers.length > 0
  const [showInvitePanel, setShowInvitePanel] = React.useState(false)

  // Force re-render every 30 s so expiry badges update without user interaction
  const [, setTick] = React.useState(0)
  React.useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000)
    return () => clearInterval(id)
  }, [])

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
          [member.user_id]: { url: returnedLink, generatedAt: Date.now() },
        }))
        setShowLinkFor((prev) => new Set([...prev, member.user_id]))
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

    const wsId =
      selectedWsId !== "__none__" ? selectedWsId : (activeWorkspaceId ?? "")
    const wsName =
      workspaces.find((w) => w.id === wsId)?.name ?? activeWorkspace?.name ?? ""
    const body: Record<string, unknown> = {
      workspaceId: wsId,
      email: email.trim(),
      role,
      firstName: firstName.trim(),
      surname: surname.trim(),
      delivery: "magic_link",
      workspaceName: wsName,
    }
    if (projectId !== "__none__") {
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
      setTeamCardTab("invite")
      setMagicLink({ url: returnedLink, generatedAt: Date.now() })
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
    <>
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
              onValueChange={(v) =>
                setActiveTab(
                  v as
                    | "teams"
                    | "billing"
                    | "notifications"
                    | "account"
                    | "admin-tools"
                )
              }
              className="flex flex-1 overflow-hidden"
            >
              <div className="hidden w-56 shrink-0 border-r p-3 md:block">
                <TabsList className="h-auto w-full flex-col items-stretch gap-1 bg-transparent p-0">
                  <TabsTrigger value="teams" className="w-full justify-start">
                    Teams
                  </TabsTrigger>
                  <TabsTrigger value="billing" className="w-full justify-start">
                    Billing
                  </TabsTrigger>
                  <TabsTrigger
                    value="notifications"
                    className="w-full justify-start"
                  >
                    Notifications
                  </TabsTrigger>
                  <TabsTrigger value="account" className="w-full justify-start">
                    Account
                  </TabsTrigger>
                  <TabsTrigger
                    value="admin-tools"
                    className="w-full justify-start"
                  >
                    Admin Tools
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex flex-1 overflow-hidden">
                <ScrollArea className="flex-1">
                  <div className="mx-auto max-w-3xl p-6">
                    <TabsList className="mb-4 flex h-auto w-full flex-wrap items-center gap-2 bg-transparent p-0 md:hidden">
                      <TabsTrigger value="teams">Teams</TabsTrigger>
                      <TabsTrigger value="billing">Billing</TabsTrigger>
                      <TabsTrigger value="notifications">
                        Notifications
                      </TabsTrigger>
                      <TabsTrigger value="account">Account</TabsTrigger>
                      <TabsTrigger value="admin-tools">Admin Tools</TabsTrigger>
                    </TabsList>

                    <TabsContent
                      value="teams"
                      forceMount
                      className="mt-0 space-y-4"
                    >
                      {hasVisibleMembers ? (
                        <Card>
                          <CardContent className="p-0">
                            <Tabs
                              value={teamCardTab}
                              onValueChange={(value) =>
                                setTeamCardTab(value as "members" | "invite")
                              }
                            >
                              <TabsList className="h-auto w-full rounded-none border-b bg-transparent p-0">
                                <TabsTrigger
                                  value="members"
                                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                                >
                                  Team Members
                                </TabsTrigger>
                                {isAdmin && (
                                  <TabsTrigger
                                    value="invite"
                                    className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                                  >
                                    Invite Team
                                  </TabsTrigger>
                                )}
                              </TabsList>

                              <TabsContent value="members" className="mt-0">
                                <div className="divide-y">
                                  {visibleMembers.map((m) => {
                                    const isSelf = m.email === user.email
                                    const memberLink = memberLinks[m.user_id]
                                    return (
                                      <div
                                        key={m.user_id}
                                        className="flex flex-col"
                                      >
                                        <div className="flex items-center justify-between gap-4 px-4 py-3">
                                          <div className="flex min-w-0 flex-1 items-center gap-3">
                                            <Avatar className="h-8 w-8 shrink-0 rounded-full">
                                              <AvatarImage
                                                src={m.avatar_url ?? ""}
                                                alt={m.full_name ?? m.email}
                                              />
                                              <AvatarFallback className="text-xs">
                                                {(m.full_name ?? m.email)
                                                  .split(" ")
                                                  .map((w) => w[0])
                                                  .join("")
                                                  .slice(0, 2)
                                                  .toUpperCase()}
                                              </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                              {m.full_name && (
                                                <p className="truncate text-sm font-medium">
                                                  {m.full_name}
                                                </p>
                                              )}
                                              <p className="truncate text-xs text-muted-foreground">
                                                {m.email}
                                              </p>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            {memberLink && (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setShowLinkFor((prev) => {
                                                    const next = new Set(prev)
                                                    if (next.has(m.user_id)) {
                                                      next.delete(m.user_id)
                                                    } else {
                                                      next.add(m.user_id)
                                                    }
                                                    return next
                                                  })
                                                }
                                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 ${
                                                  isLinkExpired(memberLink)
                                                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                                    : "bg-green-500/15 text-green-600 dark:text-green-400"
                                                }`}
                                              >
                                                {isLinkExpired(memberLink)
                                                  ? "Link expired"
                                                  : "Link active"}
                                              </button>
                                            )}
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
                                            {isAdmin && !isSelf && (
                                              <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-7 text-muted-foreground"
                                                    aria-label={`Actions for ${m.email}`}
                                                  >
                                                    <IconDotsVertical className="size-3.5" />
                                                  </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                  <DropdownMenuItem
                                                    onSelect={() =>
                                                      openProfileEdit(m)
                                                    }
                                                  >
                                                    <IconUser className="size-3.5" />
                                                    Edit Profile
                                                  </DropdownMenuItem>
                                                  <DropdownMenuItem
                                                    onSelect={() => {
                                                      setEditingMember(m)
                                                      setEditRoleDraft(
                                                        m.role ?? "viewer"
                                                      )
                                                    }}
                                                  >
                                                    Edit Role
                                                  </DropdownMenuItem>
                                                  <DropdownMenuItem
                                                    disabled={
                                                      regeneratingLinkFor ===
                                                      m.user_id
                                                    }
                                                    onSelect={() =>
                                                      handleRegenerateLink(m)
                                                    }
                                                  >
                                                    <IconLink className="size-3.5" />
                                                    Generate Link
                                                  </DropdownMenuItem>
                                                  <DropdownMenuSeparator />
                                                  <DropdownMenuItem
                                                    disabled={
                                                      removingUserId ===
                                                      m.user_id
                                                    }
                                                    className="text-destructive focus:text-destructive"
                                                    onSelect={() =>
                                                      handleRemove(m.user_id)
                                                    }
                                                  >
                                                    <IconTrash className="size-3.5" />
                                                    Remove
                                                  </DropdownMenuItem>
                                                </DropdownMenuContent>
                                              </DropdownMenu>
                                            )}
                                          </div>
                                        </div>
                                        {memberLink &&
                                          showLinkFor.has(m.user_id) && (
                                            <div
                                              className={`mx-4 mb-3 flex items-start gap-2 rounded-md border px-3 py-2 ${
                                                isLinkExpired(memberLink)
                                                  ? "border-amber-500/30 bg-amber-500/5"
                                                  : "border-green-500/30 bg-green-500/5"
                                              }`}
                                            >
                                              {isLinkExpired(memberLink) ? (
                                                <span className="flex flex-1 items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                                                  <IconAlertTriangle className="size-3.5 shrink-0" />
                                                  Link expired — regenerate via
                                                  the menu
                                                </span>
                                              ) : (
                                                <code className="flex-1 text-xs leading-relaxed break-all">
                                                  {memberLink.url}
                                                </code>
                                              )}
                                              <div className="flex shrink-0 items-center gap-1">
                                                {!isLinkExpired(memberLink) && (
                                                  <CopyButton
                                                    text={memberLink.url}
                                                  />
                                                )}
                                                <Button
                                                  size="icon"
                                                  variant="ghost"
                                                  className="size-7"
                                                  onClick={() => {
                                                    toast(
                                                      "Remove magic link?",
                                                      {
                                                        description:
                                                          "This will clear the stored link for this user.",
                                                        action: {
                                                          label: "Remove",
                                                          onClick: () => {
                                                            setMemberLinks(
                                                              (prev) => {
                                                                const next = {
                                                                  ...prev,
                                                                }
                                                                delete next[
                                                                  m.user_id
                                                                ]
                                                                return next
                                                              }
                                                            )
                                                            setShowLinkFor(
                                                              (prev) => {
                                                                const next =
                                                                  new Set(prev)
                                                                next.delete(
                                                                  m.user_id
                                                                )
                                                                return next
                                                              }
                                                            )
                                                          },
                                                        },
                                                        cancel: {
                                                          label: "Cancel",
                                                          onClick: () => {},
                                                        },
                                                      }
                                                    )
                                                  }}
                                                  aria-label="Dismiss"
                                                >
                                                  <IconX className="size-3.5" />
                                                </Button>
                                              </div>
                                            </div>
                                          )}
                                      </div>
                                    )
                                  })}
                                </div>
                              </TabsContent>

                              {isAdmin && (
                                <TabsContent value="invite" className="mt-0">
                                  <form
                                    id="invite-user-form"
                                    onSubmit={handleInvite}
                                    className="flex flex-col gap-3 p-4"
                                  >
                                    {/* First / Last name / Role */}
                                    <div className="grid grid-cols-3 gap-2">
                                      <Input
                                        placeholder="First Name"
                                        value={firstName}
                                        onChange={(e) =>
                                          setFirstName(e.target.value)
                                        }
                                        aria-label="First name"
                                      />
                                      <Input
                                        placeholder="Last Name"
                                        value={surname}
                                        onChange={(e) =>
                                          setSurname(e.target.value)
                                        }
                                        aria-label="Last name"
                                      />
                                      <Select
                                        value={role}
                                        onValueChange={setRole}
                                      >
                                        <SelectTrigger
                                          className="h-9 rounded-md"
                                          aria-label="Role"
                                        >
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
                                    </div>

                                    {/* Email */}
                                    <Input
                                      id="inv-email"
                                      type="email"
                                      placeholder="Email Address"
                                      value={email}
                                      onChange={(e) => setEmail(e.target.value)}
                                      required
                                      aria-label="Email address"
                                    />

                                    {/* Workspace / Project — 50/50 */}
                                    <div className="grid grid-cols-2 gap-2">
                                      <Select
                                        value={selectedWsId}
                                        onValueChange={setSelectedWsId}
                                      >
                                        <SelectTrigger
                                          className="h-9 w-full rounded-md"
                                          aria-label="Workspace"
                                        >
                                          <SelectValue placeholder="Select workspace" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {workspaces.map((ws) => (
                                            <SelectItem
                                              key={ws.id}
                                              value={ws.id}
                                            >
                                              {ws.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>

                                      <Select
                                        value={projectId}
                                        onValueChange={setProjectId}
                                      >
                                        <SelectTrigger
                                          className="h-9 w-full rounded-md"
                                          aria-label="Project"
                                        >
                                          <SelectValue placeholder="Select project (optional)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="__none__">
                                            No specific project
                                          </SelectItem>
                                          {projects.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                              {p.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    {magicLink && (
                                      <>
                                        <Separator />
                                        <div className="flex flex-col gap-1.5">
                                          <div className="flex items-center justify-between">
                                            <Label htmlFor="invite-link">
                                              Magic Link
                                            </Label>
                                            {isLinkExpired(magicLink) && (
                                              <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                                                <IconAlertTriangle className="size-3.5" />
                                                Expired — generate a new link
                                              </span>
                                            )}
                                          </div>
                                          <div
                                            className={`flex items-center rounded-md border ${
                                              isLinkExpired(magicLink)
                                                ? "opacity-50"
                                                : ""
                                            }`}
                                          >
                                            <Input
                                              id="invite-link"
                                              value={magicLink.url}
                                              readOnly
                                              className="flex-1 border-0 shadow-none focus-visible:ring-0"
                                            />
                                            <Button
                                              type="button"
                                              size="icon"
                                              variant="ghost"
                                              className="shrink-0"
                                              disabled={isLinkExpired(
                                                magicLink
                                              )}
                                              onClick={async () => {
                                                await navigator.clipboard.writeText(
                                                  magicLink.url
                                                )
                                                toast.success("Link copied")
                                              }}
                                              aria-label="Copy link"
                                            >
                                              <IconCopy className="size-4" />
                                            </Button>
                                          </div>
                                        </div>
                                      </>
                                    )}

                                    <Button
                                      type="submit"
                                      disabled={
                                        submitting ||
                                        !email.trim() ||
                                        selectedWsId === "__none__"
                                      }
                                      className="w-full"
                                    >
                                      {submitting
                                        ? "Generating…"
                                        : "Generate Magic Link"}
                                    </Button>
                                  </form>
                                </TabsContent>
                              )}
                            </Tabs>
                          </CardContent>
                        </Card>
                      ) : (
                        <section className="space-y-3">
                          <Card>
                            <CardContent className="p-0">
                              <div className="flex h-56 flex-col items-center justify-center border text-center">
                                <div className="flex max-w-sm flex-col items-center gap-3 px-6">
                                  <AvatarGroup className="grayscale">
                                    <Avatar size="lg">
                                      <AvatarImage
                                        alt="@shadcn"
                                        src="https://github.com/shadcn.png"
                                      />
                                      <AvatarFallback>SH</AvatarFallback>
                                    </Avatar>
                                    <Avatar size="lg">
                                      <AvatarImage
                                        alt="@maxleiter"
                                        src="https://github.com/maxleiter.png"
                                      />
                                      <AvatarFallback>ML</AvatarFallback>
                                    </Avatar>
                                    <Avatar size="lg">
                                      <AvatarImage
                                        alt="@evilrabbit"
                                        src="https://github.com/evilrabbit.png"
                                      />
                                      <AvatarFallback>ER</AvatarFallback>
                                    </Avatar>
                                  </AvatarGroup>
                                  <div className="space-y-1">
                                    <p className="font-semibold">
                                      No Team Members
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      Invite your team to workspace or project.
                                    </p>
                                  </div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() =>
                                      setShowInvitePanel((current) => !current)
                                    }
                                  >
                                    Invite Team
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          {isAdmin && showInvitePanel && (
                            <Card>
                              <CardHeader>
                                <CardTitle>Invite Team</CardTitle>
                                <CardDescription>
                                  Add members to your workspace
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="flex flex-col gap-4">
                                <form
                                  id="invite-user-form"
                                  onSubmit={handleInvite}
                                  className="flex flex-col gap-3"
                                >
                                  <div className="grid grid-cols-3 gap-2">
                                    <Input
                                      placeholder="First Name"
                                      value={firstName}
                                      onChange={(e) =>
                                        setFirstName(e.target.value)
                                      }
                                      aria-label="First name"
                                    />
                                    <Input
                                      placeholder="Last Name"
                                      value={surname}
                                      onChange={(e) =>
                                        setSurname(e.target.value)
                                      }
                                      aria-label="Last name"
                                    />
                                    <Select
                                      value={role}
                                      onValueChange={setRole}
                                    >
                                      <SelectTrigger
                                        className="h-9 rounded-md"
                                        aria-label="Role"
                                      >
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
                                  </div>
                                  <Input
                                    id="inv-email"
                                    type="email"
                                    placeholder="Email Address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    aria-label="Email address"
                                  />
                                  <div className="grid grid-cols-2 gap-2">
                                    <Select
                                      value={selectedWsId}
                                      onValueChange={setSelectedWsId}
                                    >
                                      <SelectTrigger
                                        className="h-9 w-full rounded-md"
                                        aria-label="Workspace"
                                      >
                                        <SelectValue placeholder="Select workspace" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {workspaces.map((ws) => (
                                          <SelectItem key={ws.id} value={ws.id}>
                                            {ws.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Select
                                      value={projectId}
                                      onValueChange={setProjectId}
                                    >
                                      <SelectTrigger
                                        className="h-9 w-full rounded-md"
                                        aria-label="Project"
                                      >
                                        <SelectValue placeholder="Select project (optional)" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="__none__">
                                          No specific project
                                        </SelectItem>
                                        {projects.map((p) => (
                                          <SelectItem key={p.id} value={p.id}>
                                            {p.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </form>
                                {magicLink && (
                                  <>
                                    <Separator />
                                    <div className="flex flex-col gap-1.5">
                                      <div className="flex items-center justify-between">
                                        <Label htmlFor="invite-link">
                                          Magic Link
                                        </Label>
                                        {isLinkExpired(magicLink) && (
                                          <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                                            <IconAlertTriangle className="size-3.5" />
                                            Expired — generate a new link
                                          </span>
                                        )}
                                      </div>
                                      <div
                                        className={`flex items-center rounded-md border ${
                                          isLinkExpired(magicLink)
                                            ? "opacity-50"
                                            : ""
                                        }`}
                                      >
                                        <Input
                                          id="invite-link"
                                          value={magicLink.url}
                                          readOnly
                                          className="flex-1 border-0 shadow-none focus-visible:ring-0"
                                        />
                                        <Button
                                          type="button"
                                          size="icon"
                                          variant="ghost"
                                          className="shrink-0"
                                          disabled={isLinkExpired(magicLink)}
                                          onClick={async () => {
                                            await navigator.clipboard.writeText(
                                              magicLink.url
                                            )
                                            toast.success("Link copied")
                                          }}
                                          aria-label="Copy link"
                                        >
                                          <IconCopy className="size-4" />
                                        </Button>
                                      </div>
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
                                    selectedWsId === "__none__"
                                  }
                                  className="w-full"
                                >
                                  {submitting
                                    ? "Generating…"
                                    : "Generate Magic Link"}
                                </Button>
                              </CardFooter>
                            </Card>
                          )}

                          {!isAdmin && (
                            <div className="rounded-lg border p-6 text-sm text-muted-foreground">
                              Only workspace admins can invite users.
                            </div>
                          )}
                        </section>
                      )}
                    </TabsContent>

                    <TabsContent value="billing" forceMount className="mt-0">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Billing</CardTitle>
                          <CardDescription>
                            Manage plan details, payment methods, and invoices.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            Billing controls are coming to this panel.
                          </p>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent
                      value="notifications"
                      forceMount
                      className="mt-0"
                    >
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">
                            Notifications
                          </CardTitle>
                          <CardDescription>
                            Configure email, in-app, and push notification
                            preferences.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            Notification settings are coming to this panel.
                          </p>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="account" forceMount className="mt-0">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Account</CardTitle>
                          <CardDescription>
                            Update personal profile and account preferences.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            Account settings are coming to this panel.
                          </p>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent
                      value="admin-tools"
                      forceMount
                      className="mt-0"
                    >
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">
                            Admin Tools
                          </CardTitle>
                          <CardDescription>
                            Workspace-wide maintenance and administrative
                            controls.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {isAdmin ? (
                            <>
                              <div className="space-y-1.5">
                                <p className="text-sm font-medium">
                                  Browser Notifications
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Fires a test desktop notification to confirm
                                  the browser permission and in-app settings are
                                  working.
                                </p>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="mt-2"
                                  onClick={() => {
                                    if (!("Notification" in window)) {
                                      toast.error(
                                        "Browser notifications not supported"
                                      )
                                      return
                                    }
                                    if (Notification.permission === "denied") {
                                      toast.error("Notifications blocked", {
                                        description:
                                          "Reset permission in browser site settings.",
                                      })
                                      return
                                    }
                                    const fire = () =>
                                      new Notification("BPC Test", {
                                        body: "Browser notifications are working correctly.",
                                        icon: "/BPC-Logo.jpg",
                                      })
                                    if (Notification.permission === "granted") {
                                      fire()
                                      toast.success(
                                        "Test notification sent — check your OS notifications."
                                      )
                                    } else {
                                      Notification.requestPermission().then(
                                        (p) => {
                                          if (p === "granted") {
                                            fire()
                                            toast.success(
                                              "Permission granted — test notification sent."
                                            )
                                          } else {
                                            toast.error(
                                              "Permission not granted"
                                            )
                                          }
                                        }
                                      )
                                    }
                                  }}
                                >
                                  Send Test Notification
                                </Button>
                              </div>
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Only workspace admins can access admin tools.
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </div>
                </ScrollArea>
              </div>
            </Tabs>
          </div>
        </SidebarInset>
      </SidebarProvider>

      {/* ── Edit Role Dialog ───────────────────────────────────────────── */}
      <Dialog
        open={!!editingMember}
        onOpenChange={(open) => {
          if (!open) setEditingMember(null)
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>{editingMember?.email}</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Select value={editRoleDraft} onValueChange={setEditRoleDraft}>
              <SelectTrigger className="w-full capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMember(null)}>
              Cancel
            </Button>
            <Button
              disabled={updatingRoleFor === editingMember?.user_id}
              onClick={() => {
                if (!editingMember) return
                void handleRoleUpdate(editingMember.user_id, editRoleDraft)
                setEditingMember(null)
              }}
            >
              {updatingRoleFor === editingMember?.user_id ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Admin Edit Profile Dialog ─────────────────────────────────── */}
      <Dialog
        open={!!profileEditTarget}
        onOpenChange={(open) => {
          if (!open) setProfileEditTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>{profileEditTarget?.email}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleProfileSave}>
            <div className="space-y-5 py-2">
              {/* Avatar */}
              <div className="flex justify-center">
                <label className="group relative cursor-pointer">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profileAvatarUrl} />
                    <AvatarFallback className="text-lg">
                      {[profileFirstName, profileSurname]
                        .filter(Boolean)
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase() || (
                        <IconUser className="size-6 text-muted-foreground" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    {profileUploading ? (
                      <span className="text-[10px] text-white">…</span>
                    ) : (
                      <>
                        <CameraIcon className="size-5 text-white" />
                        <span className="mt-0.5 text-[10px] text-white">
                          Edit
                        </span>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={profileUploading}
                    onChange={handleProfileAvatarUpload}
                  />
                </label>
              </div>

              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="profile-first-name">First Name</Label>
                  <Input
                    id="profile-first-name"
                    value={profileFirstName}
                    onChange={(e) => setProfileFirstName(e.target.value)}
                    placeholder="First name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profile-surname">Surname</Label>
                  <Input
                    id="profile-surname"
                    value={profileSurname}
                    onChange={(e) => setProfileSurname(e.target.value)}
                    placeholder="Surname"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setProfileEditTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={profileSaving || profileUploading}
              >
                {profileSaving ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
