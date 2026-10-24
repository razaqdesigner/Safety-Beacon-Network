import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useNotificationsInbox } from "@/hooks/useNotificationsInbox";
import type { CitizenNotification } from "@workspace/api-client-react";

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useAuth();
  const {
    notifications,
    isLoading,
    isError,
    refetch,
    hasUnread,
    hasRead,
    markAllRead,
    clearRead,
  } = useNotificationsInbox(userId);
  const [refreshing, setRefreshing] = useState(false);

  function confirmClearRead() {
    const message = "Read notifications will be removed from your inbox.";
    if (Platform.OS === "web") {
      // Alert.alert has no buttons on web
      if (globalThis.confirm?.(`Clear read notifications? ${message}`)) void clearRead();
      return;
    }
    Alert.alert("Clear read notifications?", message, [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: () => void clearRead() },
    ]);
  }

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

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
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Feather name="arrow-left" size={22} color={colors.primaryForeground} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.headerTitle, { color: colors.primaryForeground }]}>
            Notifications
          </Text>
          <Text style={[styles.headerSub, { color: "rgba(255,255,255,0.55)" }]}>
            Updates from your safety team
          </Text>
        </View>
        {!isLoading && (
          <View
            style={[
              styles.countBadge,
              { backgroundColor: colors.accent + "33" },
            ]}
          >
            <Text style={[styles.countText, { color: colors.accent }]}>
              {notifications.length}
            </Text>
          </View>
        )}
      </View>

      {/* Body */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Feather name="wifi-off" size={38} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Couldn't load notifications
          </Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            Check your connection and try again.
          </Text>
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
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <View
            style={[
              styles.emptyIconWrap,
              { backgroundColor: colors.primary + "12" },
            ]}
          >
            <Feather name="bell" size={36} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No notifications yet
          </Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            Announcements from the safety team will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          ListHeaderComponent={
            hasUnread || hasRead ? (
              <View style={styles.actions}>
                {hasUnread && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void markAllRead()}
                    style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.6 : 1 }]}
                  >
                    <Feather name="check" size={14} color={colors.primary} />
                    <Text style={[styles.actionText, { color: colors.primary }]}>
                      Mark all read
                    </Text>
                  </Pressable>
                )}
                {hasRead && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={confirmClearRead}
                    style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.6 : 1 }]}
                  >
                    <Feather name="trash-2" size={14} color={colors.destructive} />
                    <Text style={[styles.actionText, { color: colors.destructive }]}>
                      Clear read
                    </Text>
                  </Pressable>
                )}
              </View>
            ) : null
          }
          data={notifications}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 28 },
          ]}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item, index }) => (
            <NotificationRow item={item} index={index} />
          )}
        />
      )}
    </View>
  );
}

function NotificationRow({ item, index }: { item: CitizenNotification; index: number }) {
  const colors = useColors();
  const router = useRouter();

  return (
    <Animated.View entering={FadeInDown.delay(index * 55).springify()}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.read ? "" : "Unread: "}${item.title}`}
        onPress={() =>
          router.push({ pathname: "/notification/[id]", params: { id: item.id } })
        }
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: colors.radius,
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.accent + "18" }]}>
          <Feather name="bell" size={18} color={colors.accent} />
          {!item.read && (
            <View
              style={[
                styles.unreadDot,
                { backgroundColor: colors.accent, borderColor: colors.card },
              ]}
            />
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.rowTitle,
              { color: colors.foreground },
              !item.read && styles.rowTitleUnread,
            ]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text style={[styles.rowBody, { color: colors.mutedForeground }]} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={[styles.rowTime, { color: colors.mutedForeground }]}>
            {formatWhen(item.createdAt)}
          </Text>
        </View>

        <Feather
          name="chevron-right"
          size={18}
          color={colors.mutedForeground}
          style={{ alignSelf: "center" }}
        />
      </Pressable>
    </Animated.View>
  );
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const mins = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
  countBadge: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
  },
  countText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },

  list: {
    padding: 16,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 18,
    marginBottom: 12,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
  },
  actionText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },

  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
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

  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadDot: {
    position: "absolute",
    top: 1,
    right: 1,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
  },
  rowTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 14.5,
  },
  rowTitleUnread: {
    fontFamily: "Inter_700Bold",
  },
  rowBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 13.5,
    lineHeight: 19,
    marginTop: 3,
  },
  rowTime: {
    fontFamily: "Inter_400Regular",
    fontSize: 11.5,
    marginTop: 8,
  },
});
