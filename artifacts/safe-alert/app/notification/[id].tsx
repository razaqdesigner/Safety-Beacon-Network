import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useNotificationsInbox } from "@/hooks/useNotificationsInbox";
import {
  getGetNotificationQueryKey,
  getListNotificationsQueryKey,
  useGetNotification,
  type CitizenNotification,
} from "@workspace/api-client-react";

export default function NotificationDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  const { markRead } = useNotificationsInbox(userId);

  // Show the copy already in the inbox instantly, then refresh from the server.
  const cached = queryClient
    .getQueryData<CitizenNotification[]>(getListNotificationsQueryKey())
    ?.find((n) => n.id === id);

  const { data: notification, isError, error, refetch } = useGetNotification(id, {
    query: {
      queryKey: getGetNotificationQueryKey(id),
      enabled: !!userId && !!id,
      placeholderData: cached,
      retry: (count, err) => (err as { status?: number })?.status !== 404 && count < 1,
    },
  });

  const notFound = (error as { status?: number } | null)?.status === 404;

  useEffect(() => {
    if (notification && !notification.read) void markRead(notification.id);
  }, [notification, markRead]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 16,
            backgroundColor: colors.primary,
          },
        ]}
      >
        <Pressable
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/notifications")
          }
          accessibilityLabel="Go back"
          accessibilityRole="button"
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Feather name="arrow-left" size={22} color={colors.primaryForeground} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.headerTitle, { color: colors.primaryForeground }]}>
            Notification
          </Text>
          <Text style={[styles.headerSub, { color: "rgba(255,255,255,0.55)" }]}>
            From your safety team
          </Text>
        </View>
      </View>

      {/* Body */}
      {notification ? (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
        >
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius,
              },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.accent + "18" }]}>
              <Feather name="bell" size={22} color={colors.accent} />
            </View>

            <Text style={[styles.title, { color: colors.foreground }]} selectable>
              {notification.title}
            </Text>

            <View style={styles.metaRow}>
              <Feather name="clock" size={12} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {formatFull(notification.createdAt)}
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <Text style={[styles.body, { color: colors.foreground }]} selectable>
              {notification.body}
            </Text>
          </View>
        </ScrollView>
      ) : !isError ? (
        // Also covers a cold start from a push, before the session has loaded
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <View style={styles.center}>
          <Feather
            name={notFound ? "inbox" : "wifi-off"}
            size={38}
            color={colors.mutedForeground}
          />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {notFound ? "Notification unavailable" : "Couldn't load notification"}
          </Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            {notFound
              ? "It may have been cleared from your inbox."
              : "Check your connection and try again."}
          </Text>
          {!notFound && (
            <Pressable
              onPress={() => refetch()}
              style={({ pressed }) => [
                styles.retryBtn,
                {
                  backgroundColor: colors.primary,
                  borderRadius: colors.radius / 2,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={[styles.retryText, { color: colors.primaryForeground }]}>
                Retry
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

function formatFull(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${time}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    gap: 10,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    letterSpacing: -0.4,
  },
  headerSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 1,
  },

  content: {
    padding: 16,
  },
  card: {
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
  },
  metaText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12.5,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 16,
  },
  body: {
    fontFamily: "Inter_400Regular",
    fontSize: 15.5,
    lineHeight: 23,
  },

  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    textAlign: "center",
    marginTop: 4,
  },
  emptySub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 4,
  },
  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  retryText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
});
