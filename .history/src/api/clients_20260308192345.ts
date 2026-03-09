import { invokeAuthedFunction } from "@/lib/invokeAuthedFunction";

export interface SystemUser {
  id: string;
  email: string | null;
  avatar_url?: string | null;
  first_name?: string | null;
  surname?: string | null;
  role?: "admin" | "client" | "contributor";
  workspace_names?: string[];
  created_at: string | null;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  confirmed_at: string | null;
}

/**
 * Fetch all users in the system (requires admin access)
 */
export async function getAllSystemUsers(
  workspaceId: string,
): Promise<SystemUser[]> {
  const data = await invokeAuthedFunction<{ users?: SystemUser[] }>("admin-users", {
    action: "list",
    workspaceId,
  });
  return (data?.users ?? []) as SystemUser[];
}

/**
 * Utility: Check if a user is an admin
 */
export function isAdminUser(user: SystemUser): boolean {
  return user.role === "admin";
}

/**
 * Utility: Check if a user is a client
 */
export function isClientUser(user: SystemUser): boolean {
  return user.role === "client" || user.role === "contributor";
}

/**
 * Utility: Filter to only client users (exclude admins)
 */
export function filterClientUsers(users: SystemUser[]): SystemUser[] {
  return users.filter(isClientUser);
}

/**
 * Utility: Filter users already in a specific workspace
 */
export function filterUsersInWorkspace(
  users: SystemUser[],
  workspaceName: string,
): SystemUser[] {
  return users.filter(
    (user) => user.workspace_names?.includes(workspaceName) ?? false,
  );
}

/**
 * Utility: Filter users NOT in a specific workspace
 */
export function filterUsersNotInWorkspace(
  users: SystemUser[],
  workspaceName: string,
): SystemUser[] {
  return users.filter(
    (user) => !(user.workspace_names?.includes(workspaceName) ?? false),
  );
}
