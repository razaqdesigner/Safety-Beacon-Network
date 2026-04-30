import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import {
  getListUserAlertsQueryKey,
  useListUserAlerts,
  type Alert,
} from "@workspace/api-client-react";

export default function Profile() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, userId, signOut } = useAuth();

  const alertsQuery = useListUserAlerts(userId ?? "", {
    query: {
      enabled: !!userId,
      queryKey: userId
        ? getListUserAlertsQueryKey(userId)
        : ["user-alerts", "none"],
    },
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 14) },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close profile"
          onPress={() => router.back()}
          hitSlop={12}
          style={[
            styles.iconBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Feather name="x" size={20} color={colors.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Profile
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingBottom:
              insets.bottom + (Platform.OS === "web" ? 34 : 24) + 24,
          },
        ]}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.primary,
              borderRadius: colors.radius,
            },
          ]}
        >
          <View
            style={[
              styles.avatar,
              { backgroundColor: colors.accent },
            ]}
          >
            <Text style={styles.avatarText}>{initials(user?.fullName)}</Text>
          </View>
          <Text
            style={[styles.name, { color: colors.primaryForeground }]}
            numberOfLines={1}
          >
            {user?.fullName ?? "—"}
          </Text>
          <Text
            style={[styles.id, { color: "rgba(255,255,255,0.75)" }]}
            numberOfLines={1}
          >
            ID #{(user?.id ?? "").slice(0, 8)}
          </Text>
        </View>

        <View style={{ gap: 12, marginTop: 20 }}>
          <InfoRow
            icon="phone"
            label="Phone"
            value={user?.phoneNumber ?? "—"}
          />
          <InfoRow
            icon="credit-card"
            label="National ID"
            value={user?.nationalId ?? "—"}
          />
          <InfoRow icon="mail" label="Email" value={user?.email ?? "—"} />
        </View>

        <View style={{ marginTop: 28 }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Alert history
          </Text>
          {alertsQuery.isLoading ? (
            <View style={[styles.empty, { borderColor: colors.border }]}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : alertsQuery.data && alertsQuery.data.length > 0 ? (
            <View style={{ gap: 10, marginTop: 10 }}>
              {alertsQuery.data.map((a) => (
                <AlertRow key={a.id} alert={a} />
              ))}
            </View>
          ) : (
            <View
              style={[
                styles.empty,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <Feather
                name="shield"
                size={22}
                color={colors.mutedForeground}
              />
              <Text
                style={[
                  styles.emptyText,
                  { color: colors.mutedForeground },
                ]}
              >
                No alerts yet — you're safe.
              </Text>
            </View>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          onPress={async () => {
            await signOut();
            router.replace("/register");
          }}
          style={({ pressed }) => [
            styles.signOut,
            {
              borderColor: colors.border,
              backgroundColor: colors.card,
              borderRadius: colors.radius,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Feather name="log-out" size={16} color={colors.destructive} />
          <Text
            style={[styles.signOutText, { color: colors.destructive }]}
          >
            Sign out of this device
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function initials(name?: string): string {
  if (!name) return "··";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.infoRow,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
        },
      ]}
    >
      <View
        style={[
          styles.infoIcon,
          { backgroundColor: colors.primary + "12" },
        ]}
      >
        <Feather name={icon} size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>
          {label}
        </Text>
        <Text
          style={[styles.infoValue, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function AlertRow({ alert }: { alert: Alert }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.alertRow,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
        },
      ]}
    >
      <View
        style={[
          styles.alertIcon,
          { backgroundColor: colors.destructive + "14" },
        ]}
      >
        <Feather name="alert-triangle" size={16} color={colors.destructive} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.alertWhen, { color: colors.foreground }]}>
          {formatWhen(new Date(alert.createdAt))}
        </Text>
        <Text style={[styles.alertMeta, { color: colors.mutedForeground }]}>
          {alert.triggerSource === "shake" ? "Shake gesture" : "Button tap"} ·{" "}
          {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}
        </Text>
      </View>
      <View
        style={[
          styles.statusChip,
          {
            backgroundColor:
              alert.status === "active"
                ? colors.destructive
                : colors.accent,
          },
        ]}
      >
        <Text style={styles.statusChipText}>{alert.status}</Text>
      </View>
    </View>
  );
}

function formatWhen(d: Date): string {
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    letterSpacing: -0.2,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    paddingHorizontal: 20,
  },
  card: {
    padding: 22,
    alignItems: "center",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  avatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    color: "#fff",
    textTransform: "uppercase",
  },
  name: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
  },
  id: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginTop: 4,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11.5,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  infoValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  empty: {
    marginTop: 12,
    paddingVertical: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  emptyText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  alertIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  alertWhen: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  alertMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusChipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10.5,
    color: "#fff",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  signOut: {
    marginTop: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  signOutText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
});
