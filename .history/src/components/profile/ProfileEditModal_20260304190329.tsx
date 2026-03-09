import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";
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
    if (!file) return;

    setUploading(true);
    setUpdateError(null);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from("avatars")
        .upload(fileName, file);

      if (error) {
        if (error.message?.includes("Bucket not found")) {
          throw new Error(
            "Avatars bucket not configured. Please create an 'avatars' bucket in Supabase Storage.",
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
          Role: <span className="font-medium">{role || "User"}</span>
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
              src={avatarUrl || "/default-avatar.png"}
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
