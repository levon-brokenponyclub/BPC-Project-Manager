/**
 * User presence utilities
 *
 * Determines online status based on last_sign_in_at timestamp.
 *
 * Note: This is a practical first implementation using last_sign_in_at from auth.users.
 * A user is considered "online" if their last sign-in was within the last 5 minutes.
 * For true real-time presence, consider implementing Supabase Realtime Presence in the future.
 */

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export interface UserPresence {
  isOnline: boolean;
  lastOnline: string | null; // ISO timestamp
}

/**
 * Determines if a user is currently online based on their last sign-in time.
 * A user is considered online if they signed in within the last 5 minutes.
 */
export function getUserPresence(
  lastSignInAt: string | null | undefined,
): UserPresence {
  if (!lastSignInAt) {
    return {
      isOnline: false,
      lastOnline: null,
    };
  }

  const lastSignIn = new Date(lastSignInAt);
  const now = new Date();
  const timeSinceLastSignIn = now.getTime() - lastSignIn.getTime();

  return {
    isOnline: timeSinceLastSignIn < ONLINE_THRESHOLD_MS,
    lastOnline: lastSignInAt,
  };
}

/**
 * Formats a timestamp as relative time (e.g., "2 min ago", "1 hour ago", "Yesterday")
 */
export function formatRelativeTime(
  timestamp: string | null | undefined,
): string {
  if (!timestamp) {
    return "Never";
  }

  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return "Just now";
  } else if (diffMin < 60) {
    return `${diffMin} min ago`;
  } else if (diffHour < 24) {
    return `${diffHour} hour${diffHour > 1 ? "s" : ""} ago`;
  } else if (diffDay === 1) {
    return "Yesterday";
  } else if (diffDay < 7) {
    return `${diffDay} days ago`;
  } else if (diffDay < 30) {
    const weeks = Math.floor(diffDay / 7);
    return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  } else if (diffDay < 365) {
    const months = Math.floor(diffDay / 30);
    return `${months} month${months > 1 ? "s" : ""} ago`;
  } else {
    const years = Math.floor(diffDay / 365);
    return `${years} year${years > 1 ? "s" : ""} ago`;
  }
}
