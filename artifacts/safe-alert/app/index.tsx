import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { Redirect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Confirmation } from "@/components/Confirmation";
import { ReassuringMessage } from "@/components/ReassuringMessage";
import { SOSButton } from "@/components/SOSButton";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useOnboarding } from "@/hooks/useOnboarding";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useShakeDetector } from "@/hooks/useShakeDetector";
import { useCreateAlert } from "@workspace/api-client-react";

type TriggerSource = "button" | "shake";

export default function Home() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isReady, userId, user, isUserLoading } = useAuth();
  const { isReady: onboardingReady, hasSeenOnboarding } = useOnboarding();

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [reassureVisible, setReassureVisible] = useState(false);
  const [trigger, setTrigger] = useState<TriggerSource | null>(null);
  const [sending, setSending] = useState(false);
  const [alertSent, setAlertSent] = useState(false);

  const createAlert = useCreateAlert();

  usePushNotifications(userId);

  const sentScale = useSharedValue(0);
  const sentOpacity = useSharedValue(0);

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
      setTrigger(null);
      setAlertSent(true);
      sentScale.value = withSpring(1, { damping: 14, stiffness: 160 });
      sentOpacity.value = withTiming(1, { duration: 300 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to send alert.";
      Alert.alert("Couldn't send alert", msg);
    } finally {
      setSending(false);
    }
  }, [userId, trigger, createAlert, sentScale, sentOpacity]);

  const handleNo = useCallback(() => {
    setConfirmVisible(false);
    setTrigger(null);
    setReassureVisible(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!userId || Platform.OS === "web") return;
    Location.getForegroundPermissionsAsync().catch(() => {});
  }, [userId]);

  const sentCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sentScale.value }],
    opacity: sentOpacity.value,
  }));

  if (!isReady || !onboardingReady || (userId && isUserLoading)) {
    return (
      <View style={[styles.center, { backgroundColor: colors.primary }]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (!userId) {
    return <Redirect href={hasSeenOnboarding ? "/register" : "/onboarding"} />;
  }

  const firstName = user?.fullName?.split(" ")[0] ?? "there";

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + (Platform.OS === "web" ? 72 : 20) },
        ]}
      >
        {/* Brand badge */}
        <View style={styles.brandRow}>
          <View
            style={[
              styles.shieldIcon,
              { backgroundColor: colors.primary, shadowColor: colors.primary },
            ]}
          >
            <View
              style={[
                styles.shieldDot,
                { backgroundColor: colors.accent },
              ]}
            />
          </View>
          <View style={{ marginLeft: 10 }}>
            <Text style={[styles.brandName, { color: colors.foreground }]}>
              Safe<Text style={{ color: colors.accent }}>Alert</Text>
            </Text>
            <Text style={[styles.brandSub, { color: colors.mutedForeground }]}>
              COMMUNITY SAFETY
            </Text>
          </View>
        </View>

        {/* Header actions */}
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View alert history"
            onPress={() => router.push("/history")}
            style={({ pressed }) => [
              styles.iconBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Feather name="clock" size={18} color={colors.primary} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            onPress={() => router.push("/profile")}
            style={({ pressed }) => [
              styles.profileBtn,
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={[styles.profileInitial, { color: colors.primaryForeground }]}>
              {firstName.charAt(0).toUpperCase()}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ── Status bar ── */}
      <StatusBar alertSent={alertSent} />

      {/* ── Body ── */}
      <View style={styles.body}>
        {/* Greeting */}
        <View style={styles.greetBlock}>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
            {timeOfDayGreeting()}
          </Text>
          <Text
            style={[styles.name, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {firstName}
          </Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
            Your safety is our priority
          </Text>
        </View>

        {/* SOS Button */}
        <SOSButton onPress={() => openConfirm("button")} disabled={sending} />

        {/* Sent confirmation card */}
        {alertSent && (
          <Animated.View
            style={[
              styles.sentCard,
              { backgroundColor: colors.primary, borderRadius: colors.radius },
              sentCardStyle,
            ]}
          >
            <View style={[styles.sentIconWrap, { backgroundColor: colors.accent + "22" }]}>
              <Feather name="check-circle" size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sentTitle, { color: colors.primaryForeground }]}>
                Help is on the way
              </Text>
              <Text style={[styles.sentSub, { color: "rgba(255,255,255,0.65)" }]}>
                Location sent to dispatchers
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Shake hint */}
        {!alertSent && (
          <View
            style={[
              styles.shakeCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius,
              },
            ]}
          >
            <View style={[styles.shakeIconWrap, { backgroundColor: colors.accent + "18" }]}>
              <Feather name="smartphone" size={17} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.shakeTitle, { color: colors.foreground }]}>
                Shake 4× for silent trigger
              </Text>
              <Text style={[styles.shakeSub, { color: colors.mutedForeground }]}>
                A discreet alternative when tapping isn't possible
              </Text>
            </View>
          </View>
        )}
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

function StatusBar({ alertSent }: { alertSent: boolean }) {
  const colors = useColors();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (alertSent) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      pulse.value = withTiming(1, { duration: 300 });
    }
  }, [alertSent, pulse]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <View
      style={[
        styles.statusBar,
        {
          backgroundColor: alertSent ? colors.primary : colors.card,
          borderColor: alertSent ? colors.primary : colors.border,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.statusDot,
          {
            backgroundColor: alertSent ? colors.accent : "#3CB371",
          },
          dotStyle,
        ]}
      />
      <Text
        style={[
          styles.statusText,
          { color: alertSent ? colors.primaryForeground : colors.mutedForeground },
        ]}
      >
        {alertSent ? "Alert active · dispatchers notified" : "System active · standing by"}
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  screen: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingBottom: 12,
  },
  brandRow: { flexDirection: "row", alignItems: "center" },
  shieldIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 12,
    elevation: 4,
  },
  shieldDot: { width: 13, height: 13, borderRadius: 7 },
  brandName: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    letterSpacing: -0.3,
  },
  brandSub: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    letterSpacing: 1.4,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInitial: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },

  statusBar: {
    marginHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  statusText: { fontFamily: "Inter_500Medium", fontSize: 13 },

  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingHorizontal: 22,
    paddingBottom: 28,
  },

  greetBlock: { alignItems: "center" },
  greeting: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  name: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
    letterSpacing: -0.8,
    textAlign: "center",
  },
  tagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 4,
    letterSpacing: 0.1,
  },

  sentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    width: "100%",
    maxWidth: 460,
  },
  sentIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  sentTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    marginBottom: 2,
  },
  sentSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },

  shakeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    width: "100%",
    maxWidth: 460,
  },
  shakeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  shakeTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    marginBottom: 3,
  },
  shakeSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12.5,
    lineHeight: 17,
  },
});
