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
    throw new Error(`Session error: ${sessionError.message}`);
  }

  let session = sessionData.session;

  // Check if session is missing or expiring soon (within 30 seconds)
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = session?.expires_at ?? 0;
  const isExpiringSoon = expiresAt - now < 30;

  if (!session || isExpiringSoon) {
    // Attempt to refresh the session
    const { data: refreshData, error: refreshError } =
      await supabase.auth.refreshSession();

    if (refreshError) {
      throw new Error(`Session refresh failed: ${refreshError.message}`);
    }

    session = refreshData.session;
  }

  // Ensure we have a valid session with access token
  if (!session?.access_token) {
    throw new Error("No valid session. Please log in again.");
  }

  // Invoke the function with Authorization header
  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  // Handle function errors
  if (error) {
    throw new Error(error.message || `Function ${functionName} failed`);
  }

  // Handle application-level errors returned in the response
  if (data?.error) {
    throw new Error(String(data.error));
  }

  return data as TData;
}
