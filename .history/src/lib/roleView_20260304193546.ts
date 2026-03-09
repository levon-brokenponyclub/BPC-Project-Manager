export type WorkspaceRole = "admin" | "client" | null;
export type RoleViewMode = "admin" | "client";

const ROLE_VIEW_KEY_PREFIX = "bpc-role-view:";

function isRoleViewMode(value: string | null): value is RoleViewMode {
  return value === "admin" || value === "client";
}

export function getStoredRoleView(workspaceId: string): RoleViewMode | null {
  if (typeof window === "undefined" || !workspaceId) {
    return null;
  }

  const value = window.localStorage.getItem(`${ROLE_VIEW_KEY_PREFIX}${workspaceId}`);
  return isRoleViewMode(value) ? value : null;
}

export function setStoredRoleView(
  workspaceId: string,
  roleView: RoleViewMode,
): void {
  if (typeof window === "undefined" || !workspaceId) {
    return;
  }

  window.localStorage.setItem(`${ROLE_VIEW_KEY_PREFIX}${workspaceId}`, roleView);
}

export function getEffectiveRole(
  actualRole: WorkspaceRole,
  roleView: RoleViewMode,
): WorkspaceRole {
  if (actualRole !== "admin") {
    return actualRole;
  }

  return roleView;
}