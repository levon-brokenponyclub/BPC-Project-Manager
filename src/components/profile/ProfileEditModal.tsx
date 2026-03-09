import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bell, BellOff, Mail, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getUserNotificationPreferences,
  updateUserNotificationPreferences,
  sendTestEmailNotification,
} from "@/api";
import {
  getBrowserNotificationPermission,
  isBrowserNotificationSupported,
  isDesktopNotificationPaused,
  requestBrowserNotificationPermission,
  setDesktopNotificationPaused,
  showBrowserNotification,
} from "@/lib/browserNotifications";
import { notify } from "@/lib/toast";
import type { User } from "@supabase/supabase-js";

interface ProfileEditModalProps {
  user: User | null;
  role: string | null;
  workspaceId?: string;
  onClose: () => void;
}

export function ProfileEditModal({
  user,
  role,
  workspaceId,
  onClose,
}: ProfileEditModalProps): React.ReactElement {
  const [firstName, setFirstName] = useState(
    user?.user_metadata?.first_name || "",
  );
  const [surname, setSurname] = useState(user?.user_metadata?.surname || "");
  const [avatarUrl, setAvatarUrl] = useState(
    user?.user_metadata?.avatar_url || "",
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [uploading, setUploading] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Desktop notification state — kept local; no server round-trip needed.
  const [notifPermission, setNotifPermission] = useState(
    getBrowserNotificationPermission,
  );
  const [notifPaused, setNotifPaused] = useState(isDesktopNotificationPaused);

  // Email notification preferences
  const emailPrefsQuery = useQuery({
    queryKey: ["emailNotificationPreferences"],
    queryFn: getUserNotificationPreferences,
  });

  const updateEmailPrefsMutation = useMutation({
    mutationFn: updateUserNotificationPreferences,
    onSuccess: () => {
      emailPrefsQuery.refetch();
      notify.success("Saved", "Email preferences updated");
    },
    onError: (err: Error) => {
      notify.error("Error", err.message || "Failed to update preferences");
    },
  });

  const testEmailMutation = useMutation({
    mutationFn: sendTestEmailNotification,
    onSuccess: () => {
      notify.success(
        "Test email sent",
        "Check your inbox for a test notification email.",
      );
    },
    onError: (err: Error) => {
      notify.error("Error", err.message || "Failed to send test email");
    },
  });

  async function handleRequestPermission(): Promise<void> {
    const result = await requestBrowserNotificationPermission();
    setNotifPermission(result);
    // Clear any in-app pause when the user explicitly enables.
    if (result === "granted") {
      setDesktopNotificationPaused(false);
      setNotifPaused(false);
    }
  }

  function handleTogglePaused(): void {
    const next = !notifPaused;
    setDesktopNotificationPaused(next);
    setNotifPaused(next);
  }

  async function handleAdminTestNotification(): Promise<void> {
    if (!isBrowserNotificationSupported()) {
      notify.info(
        "Not supported",
        "Your browser does not support desktop notifications.",
      );
      return;
    }
    let permission = getBrowserNotificationPermission();
    if (permission === "default") {
      permission = await requestBrowserNotificationPermission();
      setNotifPermission(permission);
      if (permission === "granted") {
        setDesktopNotificationPaused(false);
        setNotifPaused(false);
      }
    }
    if (permission !== "granted") {
      notify.error(
        "Notifications blocked",
        "Enable desktop notifications in your browser site settings and try again.",
      );
      return;
    }
    const result = showBrowserNotification({
      title: "Browser notification test",
      body: `This is a test desktop notification from the ${workspaceId ? "workspace" : "Sognos workspace"}.`,
      tag: "desktop-notification-test",
      route: workspaceId ? `/w/${workspaceId}/project-overview` : null,
    });
    if (result) {
      notify.success(
        "Test desktop notification sent",
        "Check your browser notifications.",
      );
    } else {
      notify.info(
        "Notification suppressed",
        "Desktop notifications may be paused or blocked.",
      );
    }
  }

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

      const updates: Record<string, unknown> = {
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

      const { error } = await supabase.auth.updateUser(
        updates as Parameters<typeof supabase.auth.updateUser>[0],
      );
      if (error) throw error;
    },
    onSuccess: () => {
      setUpdateStatus("Profile updated successfully!");
      setPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 1000);
    },
    onError: (err: Error) => {
      setUpdateError(err.message || "Update failed");
    },
  });

  async function handleImageUpload(
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    setUploading(true);
    setUpdateError(null);

    try {
      const fileExt = file.name.split(".").pop() || "png";
      // Policy requires: bucket=avatars, path starts with auth.uid()/
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, {
          upsert: true,
          contentType: file.type || "image/png",
          cacheControl: "3600",
        });

      if (error) {
        if (error.message?.includes("Bucket not found")) {
          throw new Error(
            "Avatars bucket not configured. Please create an 'avatars' bucket in Supabase Storage.",
          );
        }
        if (
          error.message?.toLowerCase().includes("row-level security") ||
          error.message?.toLowerCase().includes("violates")
        ) {
          throw new Error(
            "Avatar upload blocked by storage policy. Apply the avatars storage migration and retry.",
          );
        }
        throw error;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(data.path);

      setAvatarUrl(publicUrl);
    } catch (err: unknown) {
      setUpdateError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const controlClassName =
    "h-10 w-full rounded-md border border-border/70 bg-background/40 px-3 text-sm text-foreground transition focus-ring";

  return (
    <div className="fixed inset-0 z-50 !mt-0 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[calc(100vh-3rem)] w-full max-w-[560px] flex-col overflow-hidden rounded-[4px] border border-border bg-card shadow-modal dark:shadow-elevated">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <p className="text-[13px] font-semibold text-foreground">
            Edit Profile
          </p>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring inline-flex h-7 items-center gap-1 rounded-[4px] border border-border/70 bg-card/70 px-2 text-xs font-medium text-muted transition-colors hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Close
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <form
            id="profile-edit-form"
            onSubmit={(e) => {
              e.preventDefault();
              updateProfileMutation.mutate();
            }}
          >
            <div className="space-y-4">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <img
                  src={avatarUrl || "/defaultAvatar.png"}
                  alt="Avatar"
                  className="h-16 w-16 shrink-0 rounded-full border border-border object-cover"
                />
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-medium text-muted">
                    Profile Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="block w-full text-xs text-muted file:mr-3 file:rounded-[4px] file:border file:border-border/70 file:bg-card/70 file:px-2 file:py-1 file:text-xs file:font-medium file:text-muted hover:file:text-foreground"
                  />
                  {uploading ? (
                    <p className="text-xs text-primary">Uploading…</p>
                  ) : null}
                </div>
              </div>

              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted">
                    First Name
                  </label>
                  <Input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={controlClassName}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted">
                    Surname
                  </label>
                  <Input
                    type="text"
                    required
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    className={controlClassName}
                  />
                </div>
              </div>

              {/* Company (client only) */}
              {role === "client" && workspaceId ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted">
                    Company
                  </label>
                  <Input
                    type="text"
                    value={workspaceNameQuery.data || ""}
                    disabled
                    className={controlClassName}
                  />
                  <p className="text-[11px] text-muted">
                    Auto-assigned from workspace
                  </p>
                </div>
              ) : null}

              {/* Password */}
              <div className="space-y-3 border-t border-border pt-4">
                <p className="text-xs font-medium text-muted">
                  Update Password{" "}
                  <span className="font-normal">(optional)</span>
                </p>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted">
                    New Password
                  </label>
                  <Input
                    type="password"
                    placeholder="Leave blank to keep current"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={controlClassName}
                  />
                </div>
                {password ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted">
                      Confirm Password
                    </label>
                    <Input
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={controlClassName}
                    />
                  </div>
                ) : null}
              </div>

              {/* ── Desktop Notifications ── */}
              <div className="space-y-3 border-t border-border pt-4">
                <div>
                  <p className="text-xs font-medium text-muted">
                    Desktop Notifications
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted/70">
                    Receive browser notifications for important workspace
                    activity while the app is open.
                  </p>
                </div>

                {!isBrowserNotificationSupported() ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-surface px-2.5 py-1 text-[11px] font-medium text-muted">
                    Not supported in this browser
                  </span>
                ) : notifPermission === "denied" ? (
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-medium text-red-400">
                      Blocked
                    </span>
                    <p className="text-[11px] text-muted">
                      Notifications are blocked. Enable them in your browser
                      site settings and reload the page.
                    </p>
                  </div>
                ) : notifPermission === "granted" ? (
                  <div className="flex items-center justify-between">
                    {notifPaused ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-surface px-2.5 py-1 text-[11px] font-medium text-muted">
                        <BellOff className="h-3 w-3" />
                        Paused
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-[11px] font-medium text-green-400">
                        <Bell className="h-3 w-3" />
                        Enabled
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleTogglePaused}
                    >
                      {notifPaused ? "Resume" : "Pause"}
                    </Button>
                  </div>
                ) : (
                  /* default — not yet asked */
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => void handleRequestPermission()}
                  >
                    <Bell className="h-3.5 w-3.5" />
                    Enable Notifications
                  </Button>
                )}
              </div>

              {/* ── Admin: Desktop Notification Test ── */}
              {role === "admin" ? (
                <div className="space-y-2 rounded-md border border-border/60 bg-surface p-3">
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      Desktop Notification Test
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      Send a local browser notification to confirm delivery and
                      click behavior. No database row is created.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => void handleAdminTestNotification()}
                  >
                    <Bell className="h-3.5 w-3.5" />
                    Send Test Desktop Notification
                  </Button>
                </div>
              ) : null}

              {/* ── Email Notifications ── */}
              <div className="space-y-3 border-t border-border pt-4">
                <div>
                  <p className="text-xs font-medium text-muted">
                    Email Notifications
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted/70">
                    Receive emails for workspace activity. Only applies to
                    select notification types.
                  </p>
                </div>

                {emailPrefsQuery.isLoading ? (
                  <p className="text-xs text-muted">Loading preferences...</p>
                ) : emailPrefsQuery.error ? (
                  <p className="text-xs text-red-400">
                    Failed to load email preferences
                  </p>
                ) : (
                  <div className="space-y-3">
                    {/* Master toggle */}
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-foreground">
                        Email notifications
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          updateEmailPrefsMutation.mutate({
                            email_enabled: !emailPrefsQuery.data?.email_enabled,
                          });
                        }}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          emailPrefsQuery.data?.email_enabled
                            ? "bg-primary"
                            : "bg-border"
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            emailPrefsQuery.data?.email_enabled
                              ? "translate-x-5"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Type-specific toggles */}
                    {emailPrefsQuery.data?.email_enabled ? (
                      <div className="space-y-2 rounded-md border border-border/60 bg-surface p-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-muted">
                            Task created
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              updateEmailPrefsMutation.mutate({
                                task_created:
                                  !emailPrefsQuery.data?.task_created,
                              });
                            }}
                            className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
                              emailPrefsQuery.data?.task_created
                                ? "bg-primary"
                                : "bg-border"
                            }`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                emailPrefsQuery.data?.task_created
                                  ? "translate-x-4"
                                  : "translate-x-1"
                              }`}
                            />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-muted">
                            Task status changed
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              updateEmailPrefsMutation.mutate({
                                task_status_changed:
                                  !emailPrefsQuery.data?.task_status_changed,
                              });
                            }}
                            className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
                              emailPrefsQuery.data?.task_status_changed
                                ? "bg-primary"
                                : "bg-border"
                            }`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                emailPrefsQuery.data?.task_status_changed
                                  ? "translate-x-4"
                                  : "translate-x-1"
                              }`}
                            />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-muted">
                            Task assigned
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              updateEmailPrefsMutation.mutate({
                                task_assignee_added:
                                  !emailPrefsQuery.data?.task_assignee_added,
                              });
                            }}
                            className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
                              emailPrefsQuery.data?.task_assignee_added
                                ? "bg-primary"
                                : "bg-border"
                            }`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                emailPrefsQuery.data?.task_assignee_added
                                  ? "translate-x-4"
                                  : "translate-x-1"
                              }`}
                            />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-muted">
                            Comment added
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              updateEmailPrefsMutation.mutate({
                                comment_created:
                                  !emailPrefsQuery.data?.comment_created,
                              });
                            }}
                            className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
                              emailPrefsQuery.data?.comment_created
                                ? "bg-primary"
                                : "bg-border"
                            }`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                emailPrefsQuery.data?.comment_created
                                  ? "translate-x-4"
                                  : "translate-x-1"
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {/* ── Admin: Test Email ── */}
              {role === "admin" ? (
                <div className="space-y-2 rounded-md border border-border/60 bg-surface p-3">
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      Email Notification Test
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      Send a test email notification to your email address to
                      verify delivery.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => testEmailMutation.mutate()}
                    disabled={testEmailMutation.isPending}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {testEmailMutation.isPending
                      ? "Sending..."
                      : "Send Test Email Notification"}
                  </Button>
                </div>
              ) : null}

              {updateStatus ? (
                <p className="text-xs text-green-500">{updateStatus}</p>
              ) : null}
              {updateError ? (
                <p className="text-xs text-red-400">{updateError}</p>
              ) : null}
            </div>
          </form>
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-end gap-2 border-t border-border bg-surface px-5 py-4">
          <Button type="button" variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="profile-edit-form"
            variant="primary"
            size="md"
            disabled={updateProfileMutation.isPending || uploading}
          >
            {updateProfileMutation.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </footer>
      </div>
    </div>
  );
}

interface ProfileEditModalProps {
  user: User | null;
  role: string | null;
  workspaceId?: string;
  onClose: () => void;
}
