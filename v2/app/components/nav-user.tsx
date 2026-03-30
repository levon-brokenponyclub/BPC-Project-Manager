import * as React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog"
import { Button } from "~/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Separator } from "~/components/ui/separator"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "~/components/ui/sidebar"
import {
  ChevronsUpDownIcon,
  UserIcon,
  LogOutIcon,
  CameraIcon,
} from "lucide-react"
import { useNavigate } from "react-router"
import { supabase } from "~/lib/supabase"
import { toast } from "sonner"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const { isMobile } = useSidebar()
  const navigate = useNavigate()

  const [profileOpen, setProfileOpen] = React.useState(false)

  // Profile form state
  const [firstName, setFirstName] = React.useState("")
  const [surname, setSurname] = React.useState("")
  const [avatarUrl, setAvatarUrl] = React.useState(user.avatar)
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [uploading, setUploading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  // Populate from auth session when dialog opens
  React.useEffect(() => {
    if (!profileOpen) return
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      const meta = session.user.user_metadata
      setFirstName(meta?.first_name ?? meta?.full_name?.split(" ")[0] ?? "")
      setSurname(
        meta?.surname ?? meta?.full_name?.split(" ").slice(1).join(" ") ?? ""
      )
      setAvatarUrl(meta?.avatar_url ?? user.avatar)
      setPassword("")
      setConfirmPassword("")
    })
  }, [profileOpen])

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return

    setUploading(true)
    try {
      const ext = file.name.split(".").pop() ?? "png"
      const path = `${session.user.id}/${Date.now()}.${ext}`
      const { data, error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type })
      if (error) throw error
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(data.path)
      setAvatarUrl(publicUrl)
    } catch (err: unknown) {
      toast.error("Upload failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setUploading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (password && password.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }
    if (password && password !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    setSaving(true)

    const updates: Parameters<typeof supabase.auth.updateUser>[0] = {
      data: {
        first_name: firstName,
        surname,
        full_name: `${firstName} ${surname}`.trim(),
        avatar_url: avatarUrl,
      },
    }
    if (password) updates.password = password

    const { error } = await supabase.auth.updateUser(updates)
    setSaving(false)

    if (error) {
      toast.error("Update failed", { description: error.message })
    } else {
      toast.success("Profile updated")
      setProfileOpen(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate("/login")
  }

  const displayName = user.name || user.email
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={displayName} />
                  <AvatarFallback className="rounded-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{displayName}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
                <ChevronsUpDownIcon className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={displayName} />
                    <AvatarFallback className="rounded-lg">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{displayName}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => setProfileOpen(true)}>
                  <UserIcon />
                  Profile
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleLogout}>
                <LogOutIcon />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      {/* ── Profile dialog ── */}
      <AlertDialog open={profileOpen} onOpenChange={setProfileOpen}>
        <AlertDialogContent className="max-w-md gap-0 p-0">
          <AlertDialogHeader className="border-b px-6 pt-5 pb-4">
            <AlertDialogTitle>Profile</AlertDialogTitle>
          </AlertDialogHeader>

          <form onSubmit={handleSave}>
            <div className="space-y-5 px-6 py-5">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <label
                  htmlFor="avatar-upload"
                  className="group relative h-16 w-16 shrink-0 cursor-pointer rounded-full"
                >
                  <Avatar className="h-16 w-16 rounded-full">
                    <AvatarImage src={avatarUrl} alt={displayName} />
                    <AvatarFallback className="text-lg">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {/* hover overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <CameraIcon className="size-4 text-white" />
                    <span className="text-[9px] font-medium tracking-wide text-white uppercase">
                      {uploading ? "…" : "Edit"}
                    </span>
                  </div>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                </label>
                <div className="text-sm">
                  <p className="font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  {uploading && (
                    <p className="mt-1 text-xs text-primary">Uploading…</p>
                  )}
                </div>
              </div>

              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">First Name</Label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Surname</Label>
                  <Input
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    placeholder="Surname"
                  />
                </div>
              </div>

              {/* Password */}
              <Separator />
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Update Password{" "}
                  <span className="font-normal">(optional)</span>
                </p>
                <div className="space-y-1.5">
                  <Label className="text-xs">New Password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave blank to keep current"
                  />
                </div>
                {password && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Confirm Password</Label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setProfileOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving || uploading}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
