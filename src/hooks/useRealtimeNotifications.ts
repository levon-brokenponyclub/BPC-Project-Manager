import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { mapNotificationToToast } from "@/lib/notifications/mapNotificationToToast";
import { showBrowserNotification } from "@/lib/browserNotifications";
import type { Notification } from "@/types/models";

interface UseRealtimeNotificationsOptions {
  userId: string | null | undefined;
  workspaceId: string;
}

/**
 * Subscribes to INSERT events on `public.notifications` for the current user.
 *
 * On each new row:
 *  1. Invalidates the inbox and unread-count React Query caches.
 *  2. Shows a Sonner toast for high-value event types — but SKIPS the toast
 *     when the acting user is the same as the authenticated user (avoiding
 *     duplicate feedback for the user's own actions).
 */
export function useRealtimeNotifications({
  userId,
  workspaceId,
}: UseRealtimeNotificationsOptions): void {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  // Keep a stable ref so the effect closure always has the latest userId
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  useEffect(() => {
    if (!userId || !workspaceId) return;

    const channel = supabase
      .channel(`notifications:${workspaceId}:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (event) => {
          const notification = event.new as Notification;

          // Always refresh inbox + unread count so the badge is up to date
          void queryClient.invalidateQueries({
            queryKey: queryKeys.notifications(workspaceId),
          });
          void queryClient.invalidateQueries({
            queryKey: queryKeys.unreadNotifications(workspaceId),
          });

          // Determine the actor from the normalised payload
          const actorId =
            (notification.payload as Record<string, unknown> | null | undefined)
              ?.actor &&
            typeof (notification.payload as Record<string, unknown>).actor ===
              "object"
              ? (
                  (notification.payload as Record<string, unknown>).actor as
                    | Record<string, unknown>
                    | null
                    | undefined
                )?.id
              : null;

          // Skip toast when the acting user triggered the event themselves —
          // they already received immediate Sonner feedback from the mutation.
          const isSelfAction = actorId != null && actorId === userIdRef.current;

          if (isSelfAction) return;

          const mapped = mapNotificationToToast(notification);
          if (!mapped) return;

          if (mapped.route) {
            toast(mapped.title, {
              description: mapped.description,
              action: {
                label: "Open",
                onClick: () => navigate(mapped.route!),
              },
            });
          } else {
            toast(mapped.title, {
              description: mapped.description,
            });
          }

          // Show a native desktop notification when the tab is not actively
          // visible — Sonner covers the in-app case when the tab is focused.
          if (document.visibilityState !== "visible") {
            showBrowserNotification({
              title: mapped.title,
              body: mapped.description,
              tag: notification.id ?? undefined,
              route: mapped.route ?? null,
            });
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, workspaceId, queryClient, navigate]);
}
