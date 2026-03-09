/**
 * Browser Notifications API helper.
 *
 * Gracefully handles:
 *  - browsers / SSR environments that don't support the Notifications API
 *  - permission states: default, granted, denied
 *  - a per-user in-app opt-out via localStorage (does not affect OS permission)
 *
 * This module is the single source of truth for desktop notification
 * behaviour.  It is consumed by:
 *  - useRealtimeNotifications  — to fire notifications on qualifying events
 *  - ProfileEditModal           — to surface the enable/disable control
 */

const APP_ICON = "/BPC-Logo.jpg";

/** localStorage key for the in-app "paused" preference.  True = paused. */
const PAUSED_KEY = "bpc_desktop_notifications_paused";

/** localStorage key tracking whether the user dismissed the app-load prompt. */
export const PROMPT_DISMISSED_KEY =
  "bpc_desktop_notifications_prompt_dismissed";

export function isNotificationPromptDismissed(): boolean {
  try {
    return localStorage.getItem(PROMPT_DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

export function setNotificationPromptDismissed(dismissed: boolean): void {
  try {
    if (dismissed) {
      localStorage.setItem(PROMPT_DISMISSED_KEY, "true");
    } else {
      localStorage.removeItem(PROMPT_DISMISSED_KEY);
    }
  } catch {
    // storage unavailable — no-op
  }
}

// ---------------------------------------------------------------------------
// Support + permission helpers
// ---------------------------------------------------------------------------

export function isBrowserNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getBrowserNotificationPermission():
  | NotificationPermission
  | "unsupported" {
  if (!isBrowserNotificationSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<
  NotificationPermission | "unsupported"
> {
  if (!isBrowserNotificationSupported()) return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

// ---------------------------------------------------------------------------
// In-app paused preference
// ---------------------------------------------------------------------------

export function isDesktopNotificationPaused(): boolean {
  try {
    return localStorage.getItem(PAUSED_KEY) === "true";
  } catch {
    return false;
  }
}

export function setDesktopNotificationPaused(paused: boolean): void {
  try {
    if (paused) {
      localStorage.setItem(PAUSED_KEY, "true");
    } else {
      localStorage.removeItem(PAUSED_KEY);
    }
  } catch {
    // storage unavailable — no-op
  }
}

// ---------------------------------------------------------------------------
// Show a notification
// ---------------------------------------------------------------------------

export interface BrowserNotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  /** Deduplication tag — same tag replaces the previous notification. */
  tag?: string;
  /** App-relative route to navigate to when the notification is clicked. */
  route?: string | null;
}

/**
 * Shows a native browser desktop notification.
 *
 * Returns null (no-op) when:
 *  - the Notifications API is unsupported
 *  - permission is not granted
 *  - the user has paused desktop notifications in-app
 */
export function showBrowserNotification(
  options: BrowserNotificationOptions,
): Notification | null {
  if (!isBrowserNotificationSupported()) return null;
  if (Notification.permission !== "granted") return null;
  if (isDesktopNotificationPaused()) return null;

  const { title, body, icon = APP_ICON, tag, route } = options;

  try {
    const notification = new Notification(title, { body, icon, tag });

    notification.onclick = () => {
      // Bring the app tab to front
      window.focus();
      if (route) {
        window.location.href = route;
      }
      notification.close();
    };

    return notification;
  } catch {
    return null;
  }
}
