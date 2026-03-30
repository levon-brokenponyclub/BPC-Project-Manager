const KEY = "bpc_active_ws"

export function saveActiveWorkspace(id: string): void {
  try {
    localStorage.setItem(KEY, id)
  } catch {
    // localStorage unavailable (SSR / private browsing)
  }
}

export function loadActiveWorkspace(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

/** Resolves workspace ID: URL param → localStorage → first workspace */
export function resolveWorkspaceId(
  wsParam: string | null,
  workspaces: { id: string }[]
): string {
  const fromParam = workspaces.find((w) => w.id === wsParam)?.id
  if (fromParam) {
    saveActiveWorkspace(fromParam)
    return fromParam
  }
  const stored = loadActiveWorkspace()
  const fromStorage = workspaces.find((w) => w.id === stored)?.id
  if (fromStorage) return fromStorage
  return workspaces[0]?.id ?? ""
}
