import { supabase } from "~/lib/supabase"

/**
 * Invoke a Supabase Edge Function with automatic session refresh and proper
 * error extraction from FunctionsHttpError response bodies.
 */
export async function invokeAuthedFunction<TData = unknown>(
  functionName: string,
  body: Record<string, unknown>
): Promise<TData> {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession()

  if (sessionError) throw new Error(`Session error: ${sessionError.message}`)

  let session = sessionData.session
  const now = Math.floor(Date.now() / 1000)
  const isExpiringSoon = (session?.expires_at ?? 0) - now < 30

  if (!session || isExpiringSoon) {
    const { data: refreshData, error: refreshError } =
      await supabase.auth.refreshSession()
    if (refreshError)
      throw new Error(`Session refresh failed: ${refreshError.message}`)
    session = refreshData.session
  }

  if (!session?.access_token)
    throw new Error("No valid session. Please log in again.")

  const { data, error } = await supabase.functions.invoke<TData>(functionName, {
    body,
  })

  if (error) {
    let message = error instanceof Error ? error.message : String(error)
    try {
      const ctx = (error as { context?: Response }).context
      if (ctx) {
        const parsed = await ctx.json().catch(() => null)
        if (parsed && typeof parsed === "object" && "error" in parsed) {
          message = String((parsed as { error: unknown }).error)
        }
      }
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  if (data && typeof data === "object" && "error" in data) {
    throw new Error(String((data as { error: unknown }).error))
  }

  return data as TData
}
