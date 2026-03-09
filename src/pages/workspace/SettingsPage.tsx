import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  BellOff,
  Copy,
  Key,
  Lock,
  Mail,
  PencilLine,
  Plus,
  RotateCcw,
  Shield,
  Smartphone,
  Trash2,
  User,
  UserPlus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  getUserNotificationPreferences,
  listSupportBuckets,
  sendTestEmailNotification,
  updateUserNotificationPreferences,
} from "@/api";
import {
  getBrowserNotificationPermission,
  isBrowserNotificationSupported,
  isDesktopNotificationPaused,
  requestBrowserNotificationPermission,
  setDesktopNotificationPaused,
  showBrowserNotification,
} from "@/lib/browserNotifications";
import { getMyWorkspaceRole } from "@/api/workspaces";
import { SettingsSkeleton } from "@/components/skeletons/SettingsSkeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataStateWrapper } from "@/components/ui/DataStateWrapper";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { invokeAuthedFunction } from "@/lib/invokeAuthedFunction";
import { queryKeys } from "@/lib/queryKeys";
import { notify } from "@/lib/toast";
import {
  getEffectiveRole,
  getStoredRoleView,
  type RoleViewMode,
} from "@/lib/roleView";
import { isDemoMode, supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// File-scoped layout primitives
// ---------------------------------------------------------------------------

function SettingsSection({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return <Card className={`p-6 ${className}`}>{children}</Card>;
}

function SettingsSectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}): React.ReactElement {
  return (
    <div className="mb-5 border-b border-[#292B38] pb-4">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {description ? (
        <p className="mt-0.5 text-xs text-muted">{description}</p>
      ) : null}
    </div>
  );
}

// ─── 1. Profile Panel ──────────────────────────────────────────────────────

function ProfilePanel({
  user,
  workspaceId,
  role,
}: {
  user: any;
  workspaceId: string;
  role: string | null;
}) {
  const [firstName, setFirstName] = useState(user?.user_metadata?.first_name || "");
  const [surname, setSurname] = useState(user?.user_metadata?.surname || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [uploading, setUploading] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.user_metadata?.first_name || "");
      setSurname(user.user_metadata?.surname || "");
      setAvatarUrl(user.user_metadata?.avatar_url || "");
    }
  }, [user]);

  const workspaceNameQuery = useQuery({
    queryKey: ["workspace", workspaceId, "name"],
    queryFn: async () => {
      if (!workspaceId) return "";
      const { data, error } = await supabase
        .from("workspaces")
        .select("name")
        .eq("id", workspaceId)
        .single();
      if (error || !data) return "";
      return data.name;
    },
    enabled: Boolean(workspaceId) && role === "client",
  });

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      setUpdateStatus(null);
      setUpdateError(null);

      const updates: Record<string, any> = {
        data: {
          first_name: firstName,
          surname: surname,
          full_name: `${firstName} ${surname}`.trim(),
          avatar_url: avatarUrl,
        },
      };

      if (password) {
        if (password.length < 8) {
          throw new Error("Password must be at least 8 characters");
        }
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        updates.password = password;
      }

      const { error } = await supabase.auth.updateUser(updates);
      if (error) throw error;
    },
    onSuccess: () => {
      setUpdateStatus("Profile updated successfully!");
      setPassword("");
      setConfirmPassword("");
      notify.success("Profile updated");
    },
    onError: (err: Error) => {
      setUpdateError(err.message || "Update failed");
      notify.error("Update failed", err.message);
    },
  });

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    setUploading(true);
    setUpdateError(null);

    try {
      const fileExt = file.name.split(".").pop() || "png";
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, {
          upsert: true,
          contentType: file.type || "image/png",
          cacheControl: "3600",
        });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(data.path);

      setAvatarUrl(publicUrl);
      notify.success("Avatar uploaded");
    } catch (err: any) {
      setUpdateError(err.message || "Upload failed");
      notify.error("Upload failed", err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <SettingsSection>
        <SettingsSectionHeader
          title="Personal Information"
          description="Update your profile details and avatar."
        />
        <div className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <img
                src={avatarUrl || "/defaultAvatar.png"}
                alt="Avatar"
                className="h-20 w-20 rounded-full border-2 border-[#292B38] object-cover bg-[#191A22]"
              />
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-xs font-medium text-muted uppercase tracking-wider">
                Profile Image
              </label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="max-w-xs text-xs file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-primary hover:file:bg-primary/20"
              />
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateProfileMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted uppercase tracking-wider">
                  First Name
                </label>
                <Input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted uppercase tracking-wider">
                  Surname
                </label>
                <Input
                  type="text"
                  required
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted uppercase tracking-wider">
                Email Address
              </label>
              <Input
                type="email"
                value={user?.email || ""}
                disabled
                className="bg-[#191A22]/50 text-muted"
              />
              <p className="text-[10px] text-muted/50 italic">
                Email cannot be changed currently.
              </p>
            </div>

            {role === "client" && workspaceId && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted uppercase tracking-wider">
                  Workspace / Company
                </label>
                <Input
                  type="text"
                  value={workspaceNameQuery.data || ""}
                  disabled
                  className="bg-[#191A22]/50 text-muted"
                />
              </div>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                disabled={updateProfileMutation.isPending || uploading}
              >
                {updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </form>
        </div>
      </SettingsSection>

      <SettingsSection>
        <SettingsSectionHeader
          title="Security"
          description="Update your account password."
        />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateProfileMutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted uppercase tracking-wider">
                New Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted uppercase tracking-wider">
                Confirm Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <div className="pt-2">
            <Button
              type="submit"
              variant="secondary"
              disabled={!password || updateProfileMutation.isPending}
            >
              Update Password
            </Button>
          </div>
        </form>
      </SettingsSection>
    </div>
  );
}

// ─── 2. Notifications Panel ────────────────────────────────────────────────

function NotificationsPanel({
  role,
  workspaceId,
  workspaceName,
}: {
  role: string | null;
  workspaceId: string;
  workspaceName: string;
}) {
  const [notifPermission, setNotifPermission] = useState(getBrowserNotificationPermission());
  const [notifPaused, setNotifPaused] = useState(isDesktopNotificationPaused());

  const emailPrefsQuery = useQuery({
    queryKey: ["emailNotificationPreferences"],
    queryFn: getUserNotificationPreferences,
  });

  const updateEmailPrefsMutation = useMutation({
    mutationFn: updateUserNotificationPreferences,
    onSuccess: () => {
      emailPrefsQuery.refetch();
      notify.success("Email preferences updated");
    },
    onError: (err: Error) => {
      notify.error("Update failed", err.message);
    },
  });

  const testEmailMutation = useMutation({
    mutationFn: sendTestEmailNotification,
    onSuccess: () => {
      notify.success("Test email sent", "Check your inbox.");
    },
    onError: (err: Error) => {
      notify.error("Test failed", err.message);
    },
  });

  async function handleRequestPermission() {
    const result = await requestBrowserNotificationPermission();
    setNotifPermission(result);
    if (result === "granted") {
      setDesktopNotificationPaused(false);
      setNotifPaused(false);
    }
  }

  function handleTogglePaused() {
    const next = !notifPaused;
    setDesktopNotificationPaused(next);
    setNotifPaused(next);
  }

  function handleDesktopTest() {
    if (!isBrowserNotificationSupported()) {
      notify.info("Not supported", "Browser does not support notifications.");
      return;
    }
    const result = showBrowserNotification({
      title: "Test Notification",
      body: `Testing from ${workspaceName || "Settings"}.`,
      tag: "test",
      route: `/w/${workspaceId}/settings`,
    });
    if (result) notify.success("Test notification sent");
  }

  return (
    <div className="space-y-6">
      <SettingsSection>
        <SettingsSectionHeader
          title="Desktop Notifications"
          description="Browser-level alerts for important workspace activity."
        />
        <div className="flex items-center justify-between gap-4 rounded-lg border border-[#292B38] bg-[#191A22]/40 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-primary/10 p-2">
              <Smartphone className="size-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {notifPermission === "granted"
                  ? notifPaused
                    ? "Notifications Paused"
                    : "Notifications Enabled"
                  : notifPermission === "denied"
                    ? "Notifications Blocked"
                    : "Not Configured"}
              </p>
              <p className="text-xs text-muted">
                {notifPermission === "granted"
                  ? "You will receive alerts while the portal is open."
                  : notifPermission === "denied"
                    ? "Please enable notifications in your browser settings."
                    : "Grant permission to receive desktop alerts."}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {notifPermission === "granted" ? (
              <Button size="sm" variant="secondary" onClick={handleTogglePaused}>
                {notifPaused ? (
                  <>
                    <Bell className="mr-2 size-3" /> Resume
                  </>
                ) : (
                  <>
                    <BellOff className="mr-2 size-3" /> Pause
                  </>
                )}
              </Button>
            ) : notifPermission === "default" ? (
              <Button size="sm" onClick={handleRequestPermission}>
                Enable
              </Button>
            ) : null}
          </div>
        </div>

        {role === "admin" && (
          <div className="mt-6 border-t border-[#292B38] pt-6">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
              Admin Controls
            </h4>
            <div className="flex items-center justify-between rounded-lg border border-[#292B38] bg-[#191A22]/20 p-4">
              <div>
                <p className="text-sm font-medium text-foreground">Desktop Test</p>
                <p className="text-xs text-muted">Send a local test alert.</p>
              </div>
              <Button size="sm" variant="secondary" onClick={handleDesktopTest}>
                Send Test
              </Button>
            </div>
          </div>
        )}
      </SettingsSection>

      <SettingsSection>
        <SettingsSectionHeader
          title="Email Notifications"
          description="Manage which events trigger an email notification."
        />
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="size-4 text-muted" />
              <label className="text-sm font-medium text-foreground">Enable Email Notifications</label>
            </div>
            <button
              onClick={() =>
                updateEmailPrefsMutation.mutate({
                  email_enabled: !emailPrefsQuery.data?.email_enabled,
                })
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${emailPrefsQuery.data?.email_enabled ? "bg-primary" : "bg-[#292B38]"
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${emailPrefsQuery.data?.email_enabled ? "translate-x-6" : "translate-x-1"
                  }`}
              />
            </button>
          </div>

          {emailPrefsQuery.data?.email_enabled && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mt-4 pt-4 border-t border-[#292B38]">
              {[
                { label: "Task Created", key: "task_created" },
                { label: "Status Changed", key: "task_status_changed" },
                { label: "Assigned to You", key: "task_assignee_added" },
                { label: "Comments Added", key: "comment_created" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between rounded-lg bg-[#191A22]/40 px-3 py-2">
                  <span className="text-xs text-muted">{item.label}</span>
                  <button
                    onClick={() =>
                      updateEmailPrefsMutation.mutate({
                        [item.key]: !emailPrefsQuery.data?.[item.key as keyof typeof emailPrefsQuery.data],
                      })
                    }
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${emailPrefsQuery.data?.[item.key as keyof typeof emailPrefsQuery.data]
                      ? "bg-primary"
                      : "bg-[#292B38]"
                      }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${emailPrefsQuery.data?.[item.key as keyof typeof emailPrefsQuery.data]
                        ? "translate-x-5"
                        : "translate-x-1"
                        }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          )}

          {role === "admin" && (
            <div className="mt-6 border-t border-[#292B38] pt-6">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
                Admin Controls
              </h4>
              <div className="flex items-center justify-between rounded-lg border border-[#292B38] bg-[#191A22]/20 p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Email Test</p>
                  <p className="text-xs text-muted">Send a test email to yourself.</p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={testEmailMutation.isPending}
                  onClick={() => testEmailMutation.mutate()}
                >
                  {testEmailMutation.isPending ? "Sending..." : "Send Test"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </SettingsSection>
    </div>
  );
}

// ─── 3. Workspace Panel ────────────────────────────────────────────────────

function WorkspacePanel({
  workspaceId,
  workspaceName,
  editingName,
  setEditingName,
  setWorkspaceName,
  updateNameMutation,
  updateNameStatus,
  updateNameError,
  workspaceQuery,
  newWorkspaceName,
  setNewWorkspaceName,
  createWorkspaceMutation,
  createWorkspaceStatus,
  createWorkspaceError,
  bucketsQuery,
  setResetDialogOpen,
  setResetConfirmName,
  deleteConfirmName,
  setDeleteConfirmName,
  deleteWorkspaceMutation,
}: any) {
  return (
    <div className="space-y-6">
      <SettingsSection>
        <SettingsSectionHeader
          title="Workspace Details"
          description="Manage how your workspace is identified."
        />
        {editingName ? (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              updateNameMutation.mutate();
            }}
          >
            <Input
              type="text"
              value={workspaceName}
              onChange={(e: any) => setWorkspaceName(e.target.value)}
              required
              className="flex-1"
            />
            <Button type="submit" size="sm" disabled={updateNameMutation.isPending}>
              {updateNameMutation.isPending ? "Saving..." : "Save"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setEditingName(false);
                setWorkspaceName(workspaceQuery.data ?? "");
              }}
            >
              Cancel
            </Button>
          </form>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-0.5">
                Workspace Name
              </p>
              <p className="text-sm font-medium text-foreground">
                {workspaceName || <span className="italic text-muted line-clamp-1">Untitled Workspace</span>}
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setEditingName(true)}>
              <PencilLine className="size-3.5 mr-2" />
              Edit
            </Button>
          </div>
        )}
        {(updateNameStatus || updateNameError) && (
          <p className={`mt-3 text-xs ${updateNameStatus ? "text-green-500" : "text-red-400"}`}>
            {updateNameStatus || updateNameError}
          </p>
        )}
      </SettingsSection>

      <SettingsSection>
        <SettingsSectionHeader
          title="Support Buckets"
          description="Prepaid support hour allocations for this workspace."
        />
        {(bucketsQuery.data ?? []).length === 0 ? (
          <p className="text-sm text-muted bg-[#191A22]/20 rounded-lg p-4 border border-[#292B38] border-dashed text-center">
            No support buckets allocated yet.
          </p>
        ) : (
          <div className="space-y-3">
            {(bucketsQuery.data ?? []).map((bucket: any) => {
              const used = bucket.hours_used_cached;
              const allocated = bucket.hours_allocated;
              const remaining = Math.max(0, allocated - used);
              const pct = allocated > 0 ? Math.min(100, (used / allocated) * 100) : 0;

              return (
                <div key={bucket.id} className="rounded-lg border border-[#292B38] bg-[#191A22]/40 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground">
                      {new Date(bucket.period_start).toLocaleDateString()} –{" "}
                      {new Date(bucket.period_end).toLocaleDateString()}
                    </p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${remaining === 0 ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
                      {remaining}h remaining
                    </span>
                  </div>
                  <div className="mb-3 flex gap-4 text-[11px] text-muted">
                    <span>
                      Allocated: <span className="font-medium text-foreground">{allocated}h</span>
                    </span>
                    <span>
                      Used: <span className="font-medium text-foreground">{used}h</span>
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#292B38]">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SettingsSection>

      <SettingsSection className="border-amber-900/30 bg-amber-950/5">
        <SettingsSectionHeader
          title="Workspace Reset"
          description="Clear activity history and notifications."
        />
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-800/20 bg-amber-950/10 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-xs leading-relaxed text-amber-200/70">
            This will permanently delete all notifications, task comments, and activity history.
            <strong className="block mt-1 text-amber-400">Tasks and files will not be deleted.</strong>
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="w-full sm:w-auto border-amber-800/40 bg-amber-950/20 text-amber-400 hover:bg-amber-950/40 hover:text-amber-300"
          disabled={!workspaceId}
          onClick={() => {
            setResetConfirmName("");
            setResetDialogOpen(true);
          }}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset Workspace History
        </Button>
      </SettingsSection>

      <SettingsSection>
        <SettingsSectionHeader
          title="Management"
          description="Create and manage additional workspaces."
        />
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            createWorkspaceMutation.mutate();
          }}
        >
          <label className="text-[10px] uppercase tracking-wider text-muted font-semibold">
            Create New Workspace
          </label>
          <div className="flex gap-2">
            <Input
              type="text"
              required
              placeholder="e.g. Acme Corp"
              value={newWorkspaceName}
              onChange={(e: any) => setNewWorkspaceName(e.target.value)}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={createWorkspaceMutation.isPending || !newWorkspaceName.trim()}
            >
              <Plus className="size-4 mr-2" />
              {createWorkspaceMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
        {(createWorkspaceStatus || createWorkspaceError) && (
          <p className={`mt-3 text-xs ${createWorkspaceStatus ? "text-green-500" : "text-red-400"}`}>
            {createWorkspaceStatus || createWorkspaceError}
          </p>
        )}
      </SettingsSection>

      <SettingsSection className="border-red-900/30 bg-red-950/5">
        <SettingsSectionHeader
          title="Danger Zone"
          description="Irreversible actions for this workspace."
        />
        <div className="space-y-4">
          <div className="rounded-lg border border-red-800/20 bg-red-950/10 p-4">
            <p className="text-xs text-red-200/70 mb-3">
              To delete this workspace, type <strong className="text-red-400 font-mono">{workspaceName || workspaceId}</strong> below.
            </p>
            <Input
              type="text"
              placeholder={workspaceName || workspaceId}
              value={deleteConfirmName}
              onChange={(e: any) => setDeleteConfirmName(e.target.value)}
              className="mb-4 border-red-900/40 focus:ring-red-900"
            />
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto border-red-800/40 bg-red-950/30 text-red-400 hover:bg-red-950/50 hover:text-red-300"
              disabled={
                deleteWorkspaceMutation.isPending ||
                deleteConfirmName.trim() !== (workspaceName || workspaceId)
              }
              onClick={() => deleteWorkspaceMutation.mutate()}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {deleteWorkspaceMutation.isPending ? "Deleting..." : "Delete Workspace"}
            </Button>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}

// ─── 4. Client Access Panel ────────────────────────────────────────────────

function ClientAccessPanel({
  inviteEmail,
  setInviteEmail,
  inviteFirstName,
  setInviteFirstName,
  inviteSurname,
  setInviteSurname,
  inviteMutation,
  generateMagicLinkMutation,
  generatedMagicLink,
  handleCopyMagicLink,
  inviteStatus,
  inviteError,
}: any) {
  return (
    <div className="space-y-6">
      <SettingsSection>
        <SettingsSectionHeader
          title="Invite Client"
          description="Grant new clients access to this workspace."
        />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            inviteMutation.mutate();
          }}
          className="space-y-5"
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                Email Address
              </label>
              <Input
                type="email"
                required
                placeholder="client@example.com"
                value={inviteEmail}
                onChange={(e: any) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                  First Name
                </label>
                <Input
                  type="text"
                  placeholder="Jane"
                  value={inviteFirstName}
                  onChange={(e: any) => setInviteFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                  Surname
                </label>
                <Input
                  type="text"
                  placeholder="Smith"
                  value={inviteSurname}
                  onChange={(e: any) => setInviteSurname(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="submit" disabled={inviteMutation.isPending || !inviteEmail}>
              <UserPlus className="mr-2 size-4" />
              {inviteMutation.isPending ? "Sending..." : "Send Email Invite"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={generateMagicLinkMutation.isPending || !inviteEmail}
              onClick={() => generateMagicLinkMutation.mutate()}
            >
              <Key className="mr-2 size-4" />
              {generateMagicLinkMutation.isPending ? "Generating..." : "Generate Magic Link"}
            </Button>
          </div>
        </form>

        {(inviteStatus || inviteError) && (
          <p className={`mt-4 text-xs ${inviteStatus ? "text-green-500" : "text-red-400"}`}>
            {inviteStatus || inviteError}
          </p>
        )}

        {generatedMagicLink && (
          <div className="mt-6 rounded-lg border border-[#292B38] bg-[#191A22]/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Magic Link
              </p>
              <span className="text-[10px] text-muted italic">Click to copy</span>
            </div>
            <div className="flex gap-2">
              <Input
                value={generatedMagicLink}
                readOnly
                className="flex-1 font-mono text-[11px] bg-[#191A22] border-[#292B38]"
              />
              <Button size="sm" variant="secondary" onClick={handleCopyMagicLink}>
                <Copy className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </SettingsSection>
    </div>
  );
}

// ─── 5. Testing Panel ──────────────────────────────────────────────────────

function TestingPanel({
  workspaceId,
  testInboxRefreshMutation,
  testRealtimeToastMutation,
}: any) {
  return (
    <div className="space-y-6">
      <SettingsSection>
        <SettingsSectionHeader
          title="Realtime Notification Test"
          description="Validate realtime delivery system functionality."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[#292B38] bg-[#191A22]/40 p-5 flex flex-col items-start gap-4 h-full">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Inbox Refresh</p>
              <p className="text-xs text-muted leading-relaxed">
                Creates a notification using your account as actor. Verifies database reactivity and unread counts.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="mt-auto"
              disabled={testInboxRefreshMutation.isPending || !workspaceId}
              onClick={() => testInboxRefreshMutation.mutate()}
            >
              {testInboxRefreshMutation.isPending ? "Sent" : "Test Refresh"}
            </Button>
          </div>

          <div className="rounded-xl border border-[#292B38] bg-[#191A22]/40 p-5 flex flex-col items-start gap-4 h-full">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Realtime Toast</p>
              <p className="text-xs text-muted leading-relaxed">
                Uses a system actor ID to trigger the immediate Sonner toast notification.
              </p>
            </div>
            <Button
              size="sm"
              className="mt-auto"
              disabled={testRealtimeToastMutation.isPending || !workspaceId}
              onClick={() => testRealtimeToastMutation.mutate()}
            >
              {testRealtimeToastMutation.isPending ? "Sent" : "Test Toast"}
            </Button>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}

interface SupportBucket {
  id: string;
  period_start: string;
  period_end: string;
  hours_allocated: number;
  hours_used_cached: number;
}

export function SettingsPage(): React.ReactElement {
  const { workspaceId = "" } = useParams<{ workspaceId: string }>();
  const queryClient = useQueryClient();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteSurname, setInviteSurname] = useState("");
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [generatedMagicLink, setGeneratedMagicLink] = useState<string | null>(
    null,
  );

  const [editingName, setEditingName] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [updateNameStatus, setUpdateNameStatus] = useState<string | null>(null);
  const [updateNameError, setUpdateNameError] = useState<string | null>(null);

  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [createWorkspaceStatus, setCreateWorkspaceStatus] = useState<
    string | null
  >(null);
  const [createWorkspaceError, setCreateWorkspaceError] = useState<
    string | null
  >(null);

  const [roleViewMode, setRoleViewMode] = useState<RoleViewMode>("admin");
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetConfirmName, setResetConfirmName] = useState("");

  const [activeSection, setActiveSection] = useState<
    "profile" | "notifications" | "workspace" | "client_access" | "testing"
  >("profile");

  const [user, setUser] = useState<{
    id: string;
    email?: string;
    user_metadata: {
      first_name?: string;
      surname?: string;
      avatar_url?: string;
    };
  } | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user as any);
      }
    });
  }, []);

  const navigate = useNavigate();

  const roleQuery = useQuery({
    queryKey: ["workspace", workspaceId, "myRole"],
    queryFn: () => getMyWorkspaceRole(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const actualRole =
    roleQuery.data === "admin" || roleQuery.data === "client"
      ? roleQuery.data
      : null;
  const effectiveRole = getEffectiveRole(actualRole, roleViewMode);

  const workspaceQuery = useQuery({
    queryKey: ["workspace", workspaceId, "details"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspaces")
        .select("name")
        .eq("id", workspaceId)
        .single();

      if (error || !data) {
        return "";
      }

      return data.name;
    },
    enabled: Boolean(workspaceId),
  });

  const bucketsQuery = useQuery({
    queryKey: ["workspace", workspaceId, "supportBuckets"],
    queryFn: async () =>
      (await listSupportBuckets(workspaceId)) as SupportBucket[],
    enabled: Boolean(workspaceId),
  });

  useEffect(() => {
    if (workspaceQuery.data) {
      setWorkspaceName(workspaceQuery.data);
    }
  }, [workspaceQuery.data]);

  useEffect(() => {
    if (!workspaceId) {
      return;
    }

    setRoleViewMode(getStoredRoleView(workspaceId) ?? "admin");
  }, [workspaceId]);

  const updateNameMutation = useMutation({
    mutationFn: async () => {
      setUpdateNameStatus(null);
      setUpdateNameError(null);

      const { error } = await supabase
        .from("workspaces")
        .update({ name: workspaceName })
        .eq("id", workspaceId);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      setUpdateNameStatus("Workspace name updated.");
      setEditingName(false);
      notify.success("Workspace name updated");
    },
    onError: (err: Error) => {
      setUpdateNameError(err.message || "Update failed");
      notify.error(
        "Failed to update workspace name",
        err.message || "Update failed",
      );
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      setInviteStatus(null);
      setInviteError(null);

      if (isDemoMode) {
        throw new Error(
          "Invites are unavailable in demo mode. Switch to live mode with Supabase configured.",
        );
      }

      return invokeAuthedFunction<{ warning?: string }>("invite-client", {
        workspaceId,
        email: inviteEmail,
        firstName: inviteFirstName,
        surname: inviteSurname,
        role: "client",
        workspaceName,
        delivery: "email",
      });
    },
    onSuccess: (data: { warning?: string }) => {
      const statusMessage = data?.warning || "Invite sent successfully.";
      setInviteStatus(statusMessage);
      setGeneratedMagicLink(null);
      setInviteEmail("");
      setInviteFirstName("");
      setInviteSurname("");
      notify.success("Invite sent", statusMessage);
    },
    onError: (err: Error) => {
      setInviteError(err.message || "Invite failed");
      notify.error("Invite failed", err.message || "Invite failed");
    },
  });

  const generateMagicLinkMutation = useMutation({
    mutationFn: async () => {
      setInviteStatus(null);
      setInviteError(null);

      if (isDemoMode) {
        throw new Error(
          "Invites are unavailable in demo mode. Switch to live mode with Supabase configured.",
        );
      }

      const data = await invokeAuthedFunction<{ magicLink?: string }>(
        "invite-client",
        {
          workspaceId,
          email: inviteEmail,
          firstName: inviteFirstName,
          surname: inviteSurname,
          role: "client",
          workspaceName,
          delivery: "magic_link",
        },
      );

      if (!data?.magicLink) {
        throw new Error("Magic link was not returned by the server.");
      }

      return data;
    },
    onSuccess: (data) => {
      setGeneratedMagicLink(data.magicLink ?? null);
      setInviteStatus("Magic link generated. Copy and send it directly.");
      notify.success("Magic link generated", "Copy and send it directly.");
    },
    onError: (err: Error) => {
      setInviteError(err.message || "Magic link generation failed");
      notify.error(
        "Magic link generation failed",
        err.message || "Magic link generation failed",
      );
    },
  });

  const deleteWorkspaceMutation = useMutation({
    mutationFn: async () => {
      return invokeAuthedFunction("admin-users", {
        action: "delete_workspace",
        workspaceId,
        targetWorkspaceId: workspaceId,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.workspaces });
      notify.success("Workspace deleted");
      navigate("/workspace-select");
    },
    onError: (err: Error) => {
      notify.error(
        "Failed to delete workspace",
        err.message || "Failed to delete workspace.",
      );
    },
  });

  const createWorkspaceMutation = useMutation({
    mutationFn: async () => {
      setCreateWorkspaceStatus(null);
      setCreateWorkspaceError(null);

      return invokeAuthedFunction<{ workspace?: { id: string; name: string } }>(
        "admin-users",
        {
          action: "create_workspace",
          workspaceId,
          workspaceName: newWorkspaceName,
        },
      );
    },
    onSuccess: async (data) => {
      const createdName = data?.workspace?.name || newWorkspaceName.trim();
      setCreateWorkspaceStatus(`Workspace created: ${createdName}`);
      setNewWorkspaceName("");
      await queryClient.invalidateQueries({ queryKey: queryKeys.workspaces });
      notify.success("Workspace created", createdName);
    },
    onError: (err: Error) => {
      const message = err.message || "Workspace creation failed";
      setCreateWorkspaceError(message);
      notify.error("Workspace creation failed", message);
    },
  });

  const resetWorkspaceHistoryMutation = useMutation({
    mutationFn: async () => {
      return invokeAuthedFunction<{
        ok: boolean;
        deletedComments: number;
        deletedActivity: number;
        deletedNotifications: number;
      }>("admin-users", {
        action: "reset_workspace_history",
        workspaceId,
      });
    },
    onSuccess: async (data) => {
      setResetDialogOpen(false);
      setResetConfirmName("");
      const {
        deletedComments = 0,
        deletedActivity = 0,
        deletedNotifications = 0,
      } = data ?? {};
      notify.success(
        "Workspace history reset",
        `Deleted ${deletedNotifications} notification${deletedNotifications !== 1 ? "s" : ""}, ` +
        `${deletedComments} comment${deletedComments !== 1 ? "s" : ""}, and ` +
        `${deletedActivity} activity entr${deletedActivity !== 1 ? "ies" : "y"}.`,
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.notifications(workspaceId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.unreadNotifications(workspaceId),
        }),
        queryClient.invalidateQueries({ queryKey: ["task"] }),
        queryClient.invalidateQueries({
          queryKey: ["workspace", workspaceId, "tasks"],
        }),
      ]);
    },
    onError: (err: Error) => {
      notify.error(
        "Reset failed",
        err.message || "Failed to reset workspace history.",
      );
    },
  });

  const testInboxRefreshMutation = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw new Error(authError.message);
      }

      if (!user?.id) {
        throw new Error("You must be signed in to send a test notification.");
      }

      const actorName =
        [user.user_metadata?.first_name, user.user_metadata?.surname]
          .filter(Boolean)
          .join(" ")
          .trim() ||
        user.email ||
        "System";

      const payload = {
        actor: {
          id: user.id,
          name: actorName,
          avatar_url: user.user_metadata?.avatar_url ?? null,
        },
        summary: "Inbox refresh test",
        description:
          "This test notification was sent from Workspace Settings to confirm inbox refresh and unread count updates are working.",
        entity: {
          type: "workspace",
          title: workspaceName || "Workspace Settings",
        },
        route: workspaceId ? `/w/${workspaceId}/settings` : "/workspace-select",
      };

      const { error } = await supabase.from("notifications").insert({
        workspace_id: workspaceId,
        user_id: user.id,
        type: "workspace.invite_sent",
        payload,
      });

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      notify.success(
        "Inbox refresh test sent",
        "The inbox should refresh and the unread count should update.",
      );
    },
    onError: (err: Error) => {
      notify.error(
        "Failed to send inbox test",
        err.message || "Failed to create a realtime inbox test notification.",
      );
    },
  });

  const testRealtimeToastMutation = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw new Error(authError.message);
      }

      if (!user?.id) {
        throw new Error("You must be signed in to send a realtime toast test.");
      }

      const actorName =
        [user.user_metadata?.first_name, user.user_metadata?.surname]
          .filter(Boolean)
          .join(" ")
          .trim() || "System Tester";

      const payload = {
        actor: {
          id: "system-toast-tester",
          name: actorName,
          avatar_url: user.user_metadata?.avatar_url ?? null,
        },
        summary: "Realtime toast test",
        description:
          "This notification uses a different actor id so the realtime Sonner toast should appear immediately.",
        entity: {
          type: "workspace",
          title: workspaceName || "Workspace Settings",
        },
        route: workspaceId ? `/w/${workspaceId}/settings` : "/workspace-select",
      };

      const { error } = await supabase.from("notifications").insert({
        workspace_id: workspaceId,
        user_id: user.id,
        type: "workspace.invite_sent",
        payload,
      });

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      notify.success(
        "Realtime toast test sent",
        "A Sonner toast should appear if the realtime subscription is working.",
      );
    },
    onError: (err: Error) => {
      notify.error(
        "Failed to send realtime toast test",
        err.message || "Failed to create a realtime toast test notification.",
      );
    },
  });

  const handleCopyMagicLink = async (): Promise<void> => {
    if (!generatedMagicLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedMagicLink);
      notify.success("Copied", "Magic link copied to clipboard.");
    } catch {
      notify.error("Copy failed", "Please copy the link manually.");
    }
  };

  const isPageLoading =
    roleQuery.isLoading || workspaceQuery.isLoading || bucketsQuery.isLoading;
  const isPageError =
    roleQuery.isError || workspaceQuery.isError || bucketsQuery.isError;
  const pageError =
    roleQuery.error ?? workspaceQuery.error ?? bucketsQuery.error;

  const navItems = [
    { id: "profile", label: "Profile", icon: User, roles: ["admin", "client"] },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      roles: ["admin", "client"],
    },
    { id: "workspace", label: "Workspace", icon: Lock, roles: ["admin"] },
    {
      id: "client_access",
      label: "Client Access",
      icon: UserPlus,
      roles: ["admin"],
    },
    { id: "testing", label: "Testing", icon: Shield, roles: ["admin"] },
  ];

  const visibleNavItems = navItems.filter((item) =>
    item.roles.includes(effectiveRole || "client"),
  );

  // Fallback if role changes or current section is invalid
  useEffect(() => {
    if (effectiveRole === "client" && ["workspace", "client_access", "testing"].includes(activeSection)) {
      setActiveSection("profile");
    }
  }, [effectiveRole, activeSection]);

  return (
    <DataStateWrapper
      isLoading={isPageLoading}
      isError={isPageError}
      error={pageError}
      onRetry={() => {
        void Promise.all([
          roleQuery.refetch(),
          workspaceQuery.refetch(),
          bucketsQuery.refetch(),
        ]);
      }}
      isEmpty={false}
      skeleton={<SettingsSkeleton />}
      empty={
        <EmptyState
          title="No settings data yet"
          description="Workspace settings and support buckets will appear here when available."
        />
      }
    >
      <div className="flex min-h-full flex-col p-6 lg:p-10 bg-[#15161D]">
        {/* Page Header */}
        <div className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Settings
          </h1>
          <p className="mt-1 text-sm text-muted">
            Manage your account preferences and workspace settings.
          </p>
          <p className="mt-2 font-mono text-[11px] text-muted/30">
            {workspaceId}
          </p>
        </div>

        <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
          {/* Internal Sidebar Nav */}
          <nav className="w-full lg:w-64 lg:shrink-0">
            <div className="flex flex-row overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0 gap-1">
              {visibleNavItems.map((item) => {
                const isActive = activeSection === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id as any)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all whitespace-nowrap lg:whitespace-normal ${isActive
                      ? "bg-primary/10 text-primary shadow-sm ring-1 ring-inset ring-primary/20"
                      : "text-muted hover:bg-[#191A22] hover:text-foreground"
                      }`}
                  >
                    <Icon className={`size-4 ${isActive ? "text-primary" : ""}`} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Content Area */}
          <div className="max-w-3xl flex-1 space-y-8">
            {activeSection === "profile" && (
              <ProfilePanel user={user} workspaceId={workspaceId} role={effectiveRole} />
            )}
            {activeSection === "notifications" && (
              <NotificationsPanel role={effectiveRole} workspaceId={workspaceId} workspaceName={workspaceName} />
            )}
            {activeSection === "workspace" && (
              <WorkspacePanel
                workspaceId={workspaceId}
                workspaceName={workspaceName}
                editingName={editingName}
                setEditingName={setEditingName}
                setWorkspaceName={setWorkspaceName}
                updateNameMutation={updateNameMutation}
                updateNameStatus={updateNameStatus}
                updateNameError={updateNameError}
                workspaceQuery={workspaceQuery}
                newWorkspaceName={newWorkspaceName}
                setNewWorkspaceName={setNewWorkspaceName}
                createWorkspaceMutation={createWorkspaceMutation}
                createWorkspaceStatus={createWorkspaceStatus}
                createWorkspaceError={createWorkspaceError}
                bucketsQuery={bucketsQuery}
                setResetDialogOpen={setResetDialogOpen}
                setResetConfirmName={setResetConfirmName}
                deleteConfirmName={deleteConfirmName}
                setDeleteConfirmName={setDeleteConfirmName}
                deleteWorkspaceMutation={deleteWorkspaceMutation}
              />
            )}
            {activeSection === "client_access" && (
              <ClientAccessPanel
                inviteEmail={inviteEmail}
                setInviteEmail={setInviteEmail}
                inviteFirstName={inviteFirstName}
                setInviteFirstName={setInviteFirstName}
                inviteSurname={inviteSurname}
                setInviteSurname={setInviteSurname}
                inviteMutation={inviteMutation}
                generateMagicLinkMutation={generateMagicLinkMutation}
                generatedMagicLink={generatedMagicLink}
                handleCopyMagicLink={handleCopyMagicLink}
                inviteStatus={inviteStatus}
                inviteError={inviteError}
              />
            )}
            {activeSection === "testing" && (
              <TestingPanel
                workspaceId={workspaceId}
                testInboxRefreshMutation={testInboxRefreshMutation}
                testRealtimeToastMutation={testRealtimeToastMutation}
              />
            )}
          </div>
        </div>
      </div>
      {/* ── Workspace Reset Confirmation Modal ── */}
      {resetDialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setResetDialogOpen(false);
            }
          }}
        >
          <div className="mx-4 w-full max-w-md rounded-xl border border-[#292B38] bg-[#161720] shadow-2xl backdrop-blur-md">
            <div className="border-b border-[#292B38] px-6 py-4">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-foreground">
                  Reset Workspace History
                </h3>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-amber-800/40 bg-amber-950/10 px-4 py-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <p className="text-xs leading-relaxed text-amber-300/80">
                  This will permanently delete{" "}
                  <span className="font-semibold text-amber-300">
                    all notifications, task comments, and activity history
                  </span>{" "}
                  for this workspace for all users. Tasks and files will not be
                  deleted. This cannot be undone.
                </p>
              </div>
              <div>
                <p className="mb-2 text-xs text-muted">
                  To confirm, type{" "}
                  <span className="font-mono font-semibold text-foreground">
                    {workspaceName || workspaceId}
                  </span>{" "}
                  below.
                </p>
                <input
                  type="text"
                  autoFocus
                  placeholder={workspaceName || workspaceId}
                  value={resetConfirmName}
                  onChange={(e) => setResetConfirmName(e.target.value)}
                  className="w-full rounded-md border border-[#292B38] bg-[#191A22] px-3 py-2 text-sm text-foreground placeholder:text-muted/50 focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#292B38] px-6 py-4">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={resetWorkspaceHistoryMutation.isPending}
                onClick={() => {
                  setResetDialogOpen(false);
                  setResetConfirmName("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="border-amber-800/60 bg-amber-950/40 text-amber-400 hover:bg-amber-950/70 hover:text-amber-300"
                disabled={
                  resetWorkspaceHistoryMutation.isPending ||
                  resetConfirmName.trim() !== (workspaceName || workspaceId)
                }
                onClick={() => resetWorkspaceHistoryMutation.mutate()}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {resetWorkspaceHistoryMutation.isPending
                  ? "Resetting..."
                  : "Reset Workspace History"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </DataStateWrapper>
  );
}
