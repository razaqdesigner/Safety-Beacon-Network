import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function Verify() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { verifyRecovery, resendRecovery } = useAuth();
  const params = useLocalSearchParams<{ challengeId?: string; destination?: string }>();

  const [challengeId, setChallengeId] = useState(params.challengeId ?? "");
  const [destination, setDestination] = useState(params.destination ?? "your phone");
  const [code, setCode] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [found, setFound] = useState<{ fullName: string } | null>(null);

  const successScale = useSharedValue(0);
  const successOpacity = useSharedValue(0);

  const successStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
    opacity: successOpacity.value,
  }));

  async function onVerify() {
    if (!/^\d{6}$/.test(code)) {
      setInputError("Enter the 6-digit code");
      return;
    }
    setInputError(null);
    setApiError(null);
    setVerifying(true);
    try {
      const user = await verifyRecovery(challengeId, code);
      setFound({ fullName: user.fullName });
      successScale.value = withSpring(1, { damping: 14, stiffness: 160 });
      successOpacity.value = withSpring(1);
      // Short delay so the user sees the success state, then navigate home
      setTimeout(() => router.replace("/"), 1600);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Couldn't verify your code.");
    } finally {
      setVerifying(false);
    }
  }

  async function onResend() {
    setApiError(null);
    setResending(true);
    try {
      const challenge = await resendRecovery();
      setChallengeId(challenge.challengeId);
      setDestination(challenge.destination);
      setCode("");
      setResent(true);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "We couldn't send a new code.");
    } finally {
      setResending(false);
    }
  }

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ flexGrow: 1 }}
    >
      {/* ── Hero ── */}
      <View
        style={[
          styles.hero,
          {
            backgroundColor: colors.primary,
            paddingTop: insets.top + (Platform.OS === "web" ? 72 : 24),
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.75)" />
        </Pressable>

        <View
          style={[styles.iconCircle, { backgroundColor: colors.accent + "22" }]}
        >
          <Feather name="key" size={28} color={colors.accent} />
        </View>

        <Text style={styles.heroTitle}>Enter your code</Text>
        <Text style={styles.heroSub}>
          We sent a 6-digit code to {destination}. It expires in 10 minutes.
        </Text>
      </View>

      {/* ── Body ── */}
      <View
        style={[
          styles.body,
          {
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 40 : 32),
          },
        ]}
      >
        {/* Label */}
        <View style={{ gap: 6 }}>
          <Text style={[styles.label, { color: colors.foreground }]}>
            Verification code
          </Text>
          <Text style={[styles.labelSub, { color: colors.mutedForeground }]}>
            This confirms it's really you before restoring your account
          </Text>
        </View>

        {/* Input */}
        <View
          style={[
            styles.inputWrap,
            {
              backgroundColor: colors.card,
              borderColor: inputError ? colors.destructive : colors.border,
              borderRadius: colors.radius,
            },
          ]}
        >
          <Feather name="lock" size={18} color={colors.mutedForeground} />
          <TextInput
            value={code}
            onChangeText={(v) => {
              setCode(v.replace(/\D/g, "").slice(0, 6));
              if (inputError) setInputError(null);
            }}
            placeholder="123456"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
            autoFocus
            style={[styles.input, styles.codeInput, { color: colors.foreground }]}
          />
        </View>

        {inputError && (
          <Text style={[styles.errorText, { color: colors.destructive }]}>
            {inputError}
          </Text>
        )}

        {/* API error */}
        {apiError && !found && (
          <View
            style={[
              styles.errorBanner,
              {
                backgroundColor: colors.destructive + "14",
                borderRadius: colors.radius,
              },
            ]}
          >
            <Feather name="alert-circle" size={16} color={colors.destructive} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.errorBannerTitle, { color: colors.destructive }]}>
                Couldn't verify
              </Text>
              <Text style={[styles.errorBannerText, { color: colors.destructive }]}>
                {apiError}
              </Text>
            </View>
          </View>
        )}

        {/* Success state */}
        {found && (
          <Animated.View
            style={[
              styles.successCard,
              {
                backgroundColor: colors.primary,
                borderRadius: colors.radius,
              },
              successStyle,
            ]}
          >
            <View
              style={[
                styles.successIcon,
                { backgroundColor: colors.accent + "22" },
              ]}
            >
              <Feather name="check-circle" size={22} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.successTitle, { color: colors.primaryForeground }]}
              >
                Welcome back, {found.fullName.split(" ")[0]}!
              </Text>
              <Text
                style={[styles.successSub, { color: "rgba(255,255,255,0.65)" }]}
              >
                Restoring your session…
              </Text>
            </View>
          </Animated.View>
        )}

        {/* CTA */}
        {!found && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Verify code"
            disabled={verifying}
            onPress={onVerify}
            style={({ pressed }) => [
              styles.cta,
              {
                backgroundColor: colors.primary,
                borderRadius: colors.radius,
                opacity: pressed || verifying ? 0.88 : 1,
              },
            ]}
          >
            {verifying ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="check" size={18} color="#fff" />
                <Text style={styles.ctaText}>Verify & continue</Text>
              </>
            )}
          </Pressable>
        )}

        {/* Resend */}
        {!found && (
          <Pressable
            onPress={onResend}
            disabled={resending}
            accessibilityRole="button"
            style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed || resending ? 0.7 : 1 }]}
          >
            <Text style={[styles.secondaryText, { color: colors.mutedForeground }]}>
              {resent ? "New code sent. " : "Didn't get it? "}
              <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>
                {resending ? "Sending…" : "Send a new code"}
              </Text>
            </Text>
          </Pressable>
        )}

        {/* Security note */}
        <View
          style={[
            styles.securityNote,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius,
            },
          ]}
        >
          <Feather name="shield" size={13} color={colors.accent} />
          <Text style={[styles.securityText, { color: colors.mutedForeground }]}>
            SafeAlert will never ask you for this code. Don't share it with anyone.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 12,
  },
  backBtn: {
    alignSelf: "flex-start",
    padding: 4,
    marginBottom: 4,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heroTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: "#fff",
    letterSpacing: -0.6,
  },
  heroSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14.5,
    color: "rgba(255,255,255,0.58)",
    lineHeight: 21,
  },

  body: {
    paddingHorizontal: 24,
    paddingTop: 28,
    gap: 18,
  },

  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  labelSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },

  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    height: 58,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    paddingVertical: 0,
  },
  codeInput: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 20,
    letterSpacing: 6,
  },
  errorText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginTop: -8,
    marginLeft: 4,
  },

  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
  },
  errorBannerTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  errorBannerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },

  successCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
  },
  successIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    marginBottom: 2,
  },
  successSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },

  cta: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  ctaText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#fff",
  },

  secondaryBtn: { alignItems: "center", paddingVertical: 4 },
  secondaryText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
  },

  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  securityText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
});
