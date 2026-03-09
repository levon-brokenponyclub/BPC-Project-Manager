import { useEffect, useState } from "react";

export type NotificationPermissionStatus = "default" | "granted" | "denied";

interface UseNotificationPermissionReturn {
  permission: NotificationPermissionStatus;
  requestPermission: () => Promise<NotificationPermissionStatus>;
  isSupported: boolean;
}

export function useNotificationPermission(): UseNotificationPermissionReturn {
  const [permission, setPermission] = useState<NotificationPermissionStatus>(
    "default"
  );
  const [isSupported] = useState(() => "Notification" in window);

  useEffect(() => {
    if (isSupported) {
      setPermission(Notification.permission as NotificationPermissionStatus);
    }
  }, [isSupported]);

  const requestPermission = async (): Promise<NotificationPermissionStatus> => {
    if (!isSupported) {
      console.warn("Notifications are not supported in this browser");
      return "denied";
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermissionStatus);
      return result as NotificationPermissionStatus;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return "denied";
    }
  };

  return {
    permission,
    requestPermission,
    isSupported,
  };
}
