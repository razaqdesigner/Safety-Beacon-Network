import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListNotificationsQueryKey,
  useRegisterPushToken,
} from "@workspace/api-client-react";

/**
 * Requests permission for push notifications, retrieves the Expo push token,
 * and registers it with the backend once per userId.
 *
 * - No-ops on web (Expo push tokens are native-only).
 * - No-ops on Android Expo Go because remote notifications are not bundled
 *   there; native builds still register normally. expo-notifications is
 *   loaded lazily for this reason: merely importing it registers a push-token
 *   listener that throws on Android Expo Go (SDK 53+).
 * - Errors are swallowed so a failed registration never breaks the home screen.
 * - Shows pushes while the app is open, refreshes the inbox when a broadcast
 *   arrives, and opens that notification when one is tapped.
 */
export function usePushNotifications(userId: string | null) {
  const registerToken = useRegisterPushToken();
  const router = useRouter();
  const queryClient = useQueryClient();
  const registered = useRef(false);
  const isAndroidExpoGo =
    Platform.OS === "android" &&
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

  useEffect(() => {
    if (
      !userId ||
      Platform.OS === "web" ||
      isAndroidExpoGo ||
      registered.current
    ) {
      return;
    }

    void (async () => {
      try {
        const Notifications = await import("expo-notifications");

        // Ask for permission — NotificationPermissionsStatus extends PermissionResponse
        // which exposes a `granted: boolean` shorthand.
        const existing = await Notifications.getPermissionsAsync();

        let granted = existing.granted;
        if (!granted) {
          const requested = await Notifications.requestPermissionsAsync();
          granted = requested.granted;
        }

        if (!granted) return;

        // Retrieve the Expo push token
        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ??
          Constants.easConfig?.projectId;

        const tokenResponse = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined,
        );
        const pushToken = tokenResponse.data;

        // Send token to backend
        await registerToken.mutateAsync({
          userId,
          data: { pushToken },
        });

        registered.current = true;
      } catch {
        // Non-critical — push registration failures should never surface to users
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAndroidExpoGo, userId]);

  useEffect(() => {
    if (!userId || Platform.OS === "web" || isAndroidExpoGo) return;

    let cancelled = false;
    const subscriptions: { remove: () => void }[] = [];

    void (async () => {
      try {
        const Notifications = await import("expo-notifications");
        if (cancelled) return;

        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });

        const broadcastId = (data: unknown) => {
          const d = data as { type?: unknown; broadcastId?: unknown } | null;
          return d?.type === "broadcast" && typeof d.broadcastId === "string"
            ? d.broadcastId
            : null;
        };

        subscriptions.push(
          Notifications.addNotificationReceivedListener((n) => {
            if (broadcastId(n.request.content.data)) {
              void queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
            }
          }),
          Notifications.addNotificationResponseReceivedListener((r) => {
            const id = broadcastId(r.notification.request.content.data);
            if (id) {
              router.push({ pathname: "/notification/[id]", params: { id } });
            }
          }),
        );
      } catch {
        // Non-critical — the inbox still polls for new notifications
      }
    })();

    return () => {
      cancelled = true;
      subscriptions.forEach((s) => s.remove());
    };
  }, [isAndroidExpoGo, userId, router, queryClient]);
}
