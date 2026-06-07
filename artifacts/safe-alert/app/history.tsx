import React from "react";
import {
  ActivityIndicator,
  FlatList,
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
import { useListUserAlerts } from "@workspace/api-client-react";
import type { Alert } from "@workspace/api-client-react";

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useAuth();

  const { data: alerts, isLoading, isError, refetch } = useListUserAlerts(
    userId ?? "",
    { query: { enabled: !!userId, queryKey: ["listUserAlerts", userId ?? ""] } },
  );

  const sorted = alerts
    ? [...alerts].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    : [];

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
            Alert History
          </Text>
          <Text style={[styles.headerSub, { color: "rgba(255,255,255,0.55)" }]}>
            Your past distress alerts
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
              {sorted.length}
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
            Couldn't load history
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
      ) : sorted.length === 0 ? (
        <View style={styles.center}>
          <View
            style={[
              styles.emptyIconWrap,
              { backgroundColor: colors.primary + "12" },
            ]}
          >
            <Feather name="shield" size={36} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No alerts yet
          </Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            When you trigger an SOS, it will appear here with its full history.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 28 },
          ]}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item, index }) => (
            <AlertRow item={item} index={index} />
          )}
        />
      )}
    </View>
  );
}

function AlertRow({ item, index }: { item: Alert; index: number }) {
  const colors = useColors();
  const resolved = item.status === "resolved";

  const statusColor = resolved ? "#3CB371" : colors.destructive;
  const statusBg = resolved ? "#3CB371" + "18" : colors.destructive + "12";
  const iconName: "check-circle" | "alert-circle" = resolved
    ? "check-circle"
    : "alert-circle";

  return (
    <Animated.View entering={FadeInDown.delay(index * 55).springify()}>
      <View
        style={[
          styles.row,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: colors.radius,
          },
        ]}
      >
        {/* Left: status icon */}
        <View style={[styles.iconWrap, { backgroundColor: statusBg }]}>
          <Feather name={iconName} size={20} color={statusColor} />
        </View>

        {/* Middle: date + trigger */}
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowDate, { color: colors.foreground }]}>
            {formatDate(item.createdAt)}
          </Text>
          <Text style={[styles.rowTime, { color: colors.mutedForeground }]}>
            {formatTime(item.createdAt)}
          </Text>
          <View style={styles.triggerRow}>
            <Feather
              name={item.triggerSource === "shake" ? "smartphone" : "alert-triangle"}
              size={11}
              color={colors.mutedForeground}
            />
            <Text style={[styles.triggerText, { color: colors.mutedForeground }]}>
              {item.triggerSource === "shake" ? "Shake trigger" : "Button trigger"}
            </Text>
          </View>
        </View>

        {/* Right: status pill */}
        <View style={[styles.pill, { backgroundColor: statusBg }]}>
          <Text style={[styles.pillText, { color: statusColor }]}>
            {resolved ? "Resolved" : "Active"}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
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
    alignItems: "center",
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
  rowDate: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  rowTime: {
    fontFamily: "Inter_400Regular",
    fontSize: 12.5,
    marginTop: 2,
  },
  triggerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 5,
  },
  triggerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11.5,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  pillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
});
