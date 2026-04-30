import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { Redirect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Brand } from "@/components/Brand";
import { Confirmation } from "@/components/Confirmation";
import { ReassuringMessage } from "@/components/ReassuringMessage";
import { SOSButton } from "@/components/SOSButton";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useShakeDetector } from "@/hooks/useShakeDetector";
import { useCreateAlert } from "@workspace/api-client-react";

type TriggerSource = "button" | "shake";

export default function Home() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isReady, userId, user, isUserLoading } = useAuth();

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [reassureVisible, setReassureVisible] = useState(false);
  const [trigger, setTrigger] = useState<TriggerSource | null>(null);
  const [sending, setSending] = useState(false);
  const [lastAlertAt, setLastAlertAt] = useState<Date | null>(null);

  const createAlert = useCreateAlert();

  const openConfirm = useCallback((source: TriggerSource) => {
    setTrigger(source);
    setConfirmVisible(true);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(
        source === "shake"
          ? Haptics.NotificationFeedbackType.Warning
          : Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});
    }
  }, []);

  useShakeDetector({
    enabled: !!userId && !confirmVisible,
    shakesRequired: 4,
    onShake: () => openConfirm("shake"),
  });

  const handleYes = useCallback(async () => {
    if (!userId || !trigger) return;
    setSending(true);
    try {
      let coords: Location.LocationObjectCoords | null = null;

      if (Platform.OS === "web") {
        coords = await new Promise((resolve, reject) => {
          if (!globalThis.navigator?.geolocation) {
            reject(new Error("Geolocation not available"));
            return;
          }
          globalThis.navigator.geolocation.getCurrentPosition(
            (pos) =>
              resolve({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                altitude: pos.coords.altitude,
                accuracy: pos.coords.accuracy,
                altitudeAccuracy: pos.coords.altitudeAccuracy,
                heading: pos.coords.heading,
                speed: pos.coords.speed,
              }),
            (err) => reject(err),
            { enableHighAccuracy: true, timeout: 15000 },
          );
        });
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Location permission required",
            "SafeAlert needs precise location access to share your position with the safety team during an emergency.",
          );
          setSending(false);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });
        coords = pos.coords;
      }

      if (!coords) throw new Error("Could not read location");

      await createAlert.mutateAsync({
        data: {
          userId,
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy ?? null,
          triggerSource: trigger,
        },
      });

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => {});
      }

      setConfirmVisible(false);
      setLastAlertAt(new Date());
      setTrigger(null);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Unable to send alert.";
      Alert.alert("Couldn't send alert", msg);
    } finally {
      setSending(false);
    }
  }, [userId, trigger, createAlert]);

  const handleNo = useCallback(() => {
    setConfirmVisible(false);
    setTrigger(null);
    setReassureVisible(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, []);

  // Pre-warm location permission so the first emergency is fast.
  useEffect(() => {
    if (!userId || Platform.OS === "web") return;
    Location.getForegroundPermissionsAsync().catch(() => {});
  }, [userId]);

  if (!isReady || (userId && isUserLoading)) {
    return (
      <View
        style={[
          styles.center,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!userId) {
    return <Redirect href="/register" />;
  }

  return (
    <View
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16) },
        ]}
      >
        <Brand size="md" align="left" />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          onPress={() => router.push("/profile")}
          style={({ pressed }) => [
            styles.profileBtn,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Feather name="user" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.greetBlock}>
          <Text
            style={[styles.greet, { color: colors.mutedForeground }]}
          >
            {timeOfDayGreeting()}
          </Text>
          <Text
            style={[styles.name, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {user?.fullName ?? "Hello"}
          </Text>
        </View>

        <SOSButton
          onPress={() => openConfirm("button")}
          disabled={sending}
        />

        <View
          style={[
            styles.hintCard,
            {
              backgroundColor: colors.card,
              borderRadius: colors.radius,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.hintIcon,
              { backgroundColor: colors.accent + "1F" },
            ]}
          >
            <Feather
              name="smartphone"
              size={18}
              color={colors.accent}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.hintTitle, { color: colors.foreground }]}>
              Shake your phone vigorously 4 times
            </Text>
            <Text
              style={[
                styles.hintBody,
                { color: colors.mutedForeground },
              ]}
            >
              When tapping isn't an option, a strong shake gesture opens the
              same emergency prompt — discreet and fast.
            </Text>
          </View>
        </View>

        <StatusPill lastAlertAt={lastAlertAt} />
      </View>

      <Confirmation
        visible={confirmVisible}
        loading={sending}
        onYes={handleYes}
        onNo={handleNo}
      />

      <ReassuringMessage
        visible={reassureVisible}
        onDismiss={() => setReassureVisible(false)}
      />
    </View>
  );
}

function StatusPill({ lastAlertAt }: { lastAlertAt: Date | null }) {
  const colors = useColors();
  if (lastAlertAt) {
    return (
      <View
        style={[
          styles.statusPill,
          {
            backgroundColor: colors.primary,
            borderRadius: 999,
          },
        ]}
      >
        <View
          style={[
            styles.dot,
            { backgroundColor: colors.accent },
          ]}
        />
        <Text style={[styles.statusText, { color: "#fff" }]}>
          Help dispatched · location sent
        </Text>
      </View>
    );
  }
  return (
    <View
      style={[
        styles.statusPill,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: 999,
        },
      ]}
    >
      <View
        style={[
          styles.dot,
          { backgroundColor: "#3CB371" },
        ]}
      />
      <Text
        style={[styles.statusText, { color: colors.mutedForeground }]}
      >
        Standing by · you're protected
      </Text>
    </View>
  );
}

function timeOfDayGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Good night,";
  if (h < 12) return "Good morning,";
  if (h < 18) return "Good afternoon,";
  return "Good evening,";
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  greetBlock: {
    alignItems: "center",
    marginTop: 12,
  },
  greet: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    letterSpacing: 0.4,
  },
  name: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    letterSpacing: -0.4,
    marginTop: 2,
    maxWidth: 320,
    textAlign: "center",
  },
  hintCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 14,
    width: "100%",
    maxWidth: 460,
  },
  hintIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  hintTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14.5,
    marginBottom: 4,
  },
  hintBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
});
