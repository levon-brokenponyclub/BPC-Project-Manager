import { supabase } from "@/lib/supabase";

/**
 * Invoke a Supabase Edge Function with automatic session refresh and Authorization header.
 *
 * This function ensures:
 * - Session is valid and not expiring soon (refreshes if needed)
 * - Authorization header is always included
 * - Errors are normalized and thrown consistently
 *
 * @param functionName - The name of the Edge Function to invoke
 * @param body - The request body to send to the function
 * @returns The typed response data from the function
 * @throws Error if session is invalid or function returns an error
 */
export async function invokeAuthedFunction<TData = unknown>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<TData> {
  // Get current session
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) {
    console.error(`[invokeAuthedFunction] Session error:`, sessionError);
    throw new Error(`Session error: ${sessionError.message}`);
  }

  let session = sessionData.session;

  // Check if session is missing or expiring soon (within 30 seconds)
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = session?.expires_at ?? 0;
  const isExpiringSoon = expiresAt - now < 30;

  if (!session || isExpiringSoon) {
    console.log(
      `[invokeAuthedFunction] Refreshing session (missing: ${!session}, expiring: ${isExpiringSoon})`,
    );
    // Attempt to refresh the session
    const { data: refreshData, error: refreshError } =
      await supabase.auth.refreshSession();

    if (refreshError) {
      console.error(`[invokeAuthedFunction] Refresh failed:`, refreshError);
      throw new Error(`Session refresh failed: ${refreshError.message}`);
    }

    session = refreshData.session;
  }

  // Ensure we have a valid session with access token
  if (!session?.access_token) {
    console.error(`[invokeAuthedFunction] No valid session after checks`);
    throw new Error("No valid session. Please log in again.");
  }

  console.log(
    `[invokeAuthedFunction] Calling ${functionName} with token (length: ${session.access_token.length})`,
  );
  console.log(
    `[invokeAuthedFunction] Token starts: ${session.access_token.substring(0, 20)}...`,
  );
  console.log(
    `[invokeAuthedFunction] Token ends: ...${session.access_token.substring(session.access_token.length - 20)}`,
  );

  // Invoke the function with Authorization header
  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  // Handle function errors
  if (error) {
    console.error(`[invokeAuthedFunction] Function error:`, error);
    throw new Error(error.message || `Function ${functionName} failed`);
  }

  // Handle application-level errors returned in the response
  if (data?.error) {
    console.error(`[invokeAuthedFunction] Application error:`, data.error);
    throw new Error(String(data.error));
  }

  console.log(`[invokeAuthedFunction] ${functionName} success`);
  return data as TData;
}
