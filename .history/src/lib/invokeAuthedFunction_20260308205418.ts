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

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  if (!supabaseUrl || !anonKey) {
    throw new Error(
      "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY for Edge Function call.",
    );
  }

  // Call functions endpoint directly so we can control auth headers exactly.
  // Send the user's JWT in Authorization — correct pattern for authenticated
  // edge function calls. The apikey header satisfies the Supabase gateway.
  const endpoint = `${supabaseUrl}/functions/v1/${functionName}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: anonKey,
    },
    body: JSON.stringify(body),
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const errorMessage =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : `Function ${functionName} failed with status ${response.status}`;

    console.error(
      `[invokeAuthedFunction] Function error (${response.status}):`,
      {
        endpoint,
        error: errorMessage,
        data,
      },
    );
    throw new Error(errorMessage);
  }

  // Handle application-level errors returned in the response
  if (data && typeof data === "object" && "error" in data) {
    const appError = (data as { error: unknown }).error;
    console.error(`[invokeAuthedFunction] Application error:`, appError);
    throw new Error(String(appError));
  }

  console.log(`[invokeAuthedFunction] ${functionName} success`);
  return data as TData;
}
