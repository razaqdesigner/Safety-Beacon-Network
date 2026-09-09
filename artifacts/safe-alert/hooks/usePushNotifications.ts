import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { useRegisterPushToken } from "@workspace/api-client-react";

/**
 * Requests permission for push notifications, retrieves the Expo push token,
 * and registers it with the backend once per userId.
 *
 * - No-ops on web (Expo push tokens are native-only).
 * - No-ops on Android Expo Go because remote notifications are not bundled
 *   there; native builds still register normally.
 * - Errors are swallowed so a failed registration never breaks the home screen.
 */
export function usePushNotifications(userId: string | null) {
  const registerToken = useRegisterPushToken();
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
}
