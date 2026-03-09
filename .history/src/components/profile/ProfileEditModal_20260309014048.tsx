import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
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
      setUpdateError(
        err instanceof Error ? err.message : "Upload failed",
      );
    } finally {
      setUploading(false);
    }
  }

  const controlClassName =
    "h-10 w-full rounded-md border border-border/70 bg-background/40 px-3 text-sm text-foreground transition focus-ring";

  return (
    <div className="fixed inset-0 z-50 !mt-0 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[calc(100vh-3rem)] w-full max-w-[560px] flex-col overflow-hidden rounded-[4px] border border-[#292B38] bg-[#191A22] shadow-card">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-[#25262B] px-5 py-3">
          <p className="text-[13px] font-semibold text-white">Edit Profile</p>
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
                  className="h-16 w-16 shrink-0 rounded-full border border-[#292B38] object-cover"
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
              <div className="space-y-3 border-t border-[#25262B] pt-4">
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
        <footer className="flex items-center justify-end gap-2 border-t border-[#25262B] bg-[#15161D] px-5 py-4">
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

      const updates: any = {
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
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 1000);
    },
    onError: (err: any) => {
      setUpdateError(err.message || "Update failed");
    },
  });

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    setUploading(true);
    setUpdateError(null);

    try {
      const fileExt = file.name.split(".").pop() || "png";
      // Match policy convention: auth.uid()-<suffix>
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
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
    } catch (err: any) {
      setUpdateError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-xl font-semibold text-foreground">Edit Profile</h2>
        <p className="text-sm text-muted mt-1">
          Role: <span className="font-medium capitalize">{role || "User"}</span>
        </p>

        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            updateProfileMutation.mutate();
          }}
        >
          <div className="flex items-center gap-4">
            <img
              src={avatarUrl || "/defaultAvatar.png"}
              alt="Avatar"
              className="h-20 w-20 rounded-full border-2 border-border object-cover"
            />
            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-1">
                Profile Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="text-sm text-muted"
              />
              {uploading && (
                <p className="text-xs text-primary mt-1">Uploading...</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                First Name
              </label>
              <Input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
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

          {role === "client" && workspaceId && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Company
              </label>
              <Input
                type="text"
                value={workspaceNameQuery.data || ""}
                disabled
                className="bg-stone-50"
              />
              <p className="text-xs text-muted mt-1">
                Auto-assigned from workspace
              </p>
            </div>
          )}

          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Update Password (optional)
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  New Password
                </label>
                <Input
                  type="password"
                  placeholder="Leave blank to keep current"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {password && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Confirm Password
                  </label>
                  <Input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateProfileMutation.isPending || uploading}
            >
              {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>

          {updateStatus && (
            <p className="text-sm text-green-600">{updateStatus}</p>
          )}
          {updateError && <p className="text-sm text-red-600">{updateError}</p>}
        </form>
      </Card>
    </div>
  );
}
