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
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

type Mode = "phone" | "nationalId";

export default function Lookup() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { startRecovery, recovering, recoverError } = useAuth();

  const [mode, setMode] = useState<Mode>("phone");
  const [value, setValue] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);

  function validate(): boolean {
    if (mode === "phone" && value.replace(/\D/g, "").length < 7) {
      setInputError("Enter a valid phone number");
      return false;
    }
    if (mode === "nationalId" && value.trim().length < 3) {
      setInputError("Enter your National ID");
      return false;
    }
    setInputError(null);
    return true;
  }

  async function onLookup() {
    if (!validate()) return;
    try {
      const challenge = await startRecovery(
        mode === "phone"
          ? { phone: value.trim() }
          : { nationalId: value.trim() },
      );
      router.push({
        pathname: "/verify",
        params: {
          challengeId: challenge.challengeId,
          destination: challenge.destination,
        },
      });
    } catch {
      // recoverError is set by context
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setValue("");
    setInputError(null);
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
          <Feather name="rotate-ccw" size={28} color={colors.accent} />
        </View>

        <Text style={styles.heroTitle}>Recover your account</Text>
        <Text style={styles.heroSub}>
          Already registered? Look yourself up to restore access on this device.
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
        {/* Mode toggle */}
        <View
          style={[
            styles.toggle,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {(["phone", "nationalId"] as Mode[]).map((m) => (
            <Pressable
              key={m}
              onPress={() => switchMode(m)}
              style={[
                styles.toggleBtn,
                {
                  backgroundColor:
                    mode === m ? colors.primary : "transparent",
                  borderRadius: colors.radius - 4,
                },
              ]}
            >
              <Feather
                name={m === "phone" ? "phone" : "credit-card"}
                size={14}
                color={
                  mode === m ? colors.primaryForeground : colors.mutedForeground
                }
              />
              <Text
                style={[
                  styles.toggleText,
                  {
                    color:
                      mode === m
                        ? colors.primaryForeground
                        : colors.mutedForeground,
                  },
                ]}
              >
                {m === "phone" ? "Phone number" : "National ID"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Label */}
        <View style={{ gap: 6 }}>
          <Text style={[styles.label, { color: colors.foreground }]}>
            {mode === "phone" ? "Your registered phone number" : "Your National ID"}
          </Text>
          <Text style={[styles.labelSub, { color: colors.mutedForeground }]}>
            {mode === "phone"
              ? "Enter the exact number you used when registering"
              : "Enter the ID number you used when registering"}
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
          <Feather
            name={mode === "phone" ? "phone" : "credit-card"}
            size={18}
            color={colors.mutedForeground}
          />
          <TextInput
            value={value}
            onChangeText={(v) => {
              setValue(v);
              if (inputError) setInputError(null);
            }}
            placeholder={mode === "phone" ? "+1 555 123 4567" : "AB1234567"}
            placeholderTextColor={colors.mutedForeground}
            keyboardType={mode === "phone" ? "phone-pad" : "default"}
            autoCapitalize={mode === "phone" ? "none" : "characters"}
            autoCorrect={false}
            style={[styles.input, { color: colors.foreground }]}
          />
        </View>

        {inputError && (
          <Text style={[styles.errorText, { color: colors.destructive }]}>
            {inputError}
          </Text>
        )}

        {/* API error */}
        {recoverError && (
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
                {recoverError.status === 404 ? "No account found" : "Couldn't send a code"}
              </Text>
              <Text style={[styles.errorBannerText, { color: colors.destructive }]}>
                {recoverError.status === 404
                  ? `Check the ${mode === "phone" ? "phone number" : "National ID"} and try again, or create a new profile.`
                  : recoverError.message}
              </Text>
            </View>
          </View>
        )}

        {/* CTA */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Find my account"
          disabled={recovering}
          onPress={onLookup}
          style={({ pressed }) => [
            styles.cta,
            {
              backgroundColor: colors.primary,
              borderRadius: colors.radius,
              opacity: pressed || recovering ? 0.88 : 1,
            },
          ]}
        >
          {recovering ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="search" size={18} color="#fff" />
              <Text style={styles.ctaText}>Find my account</Text>
            </>
          )}
        </Pressable>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>
            or
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        {/* Register instead */}
        <Pressable
          onPress={() => router.replace("/register")}
          accessibilityRole="button"
          style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={[styles.secondaryText, { color: colors.mutedForeground }]}>
            New to SafeAlert?{" "}
            <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>
              Create a profile
            </Text>
          </Text>
        </Pressable>

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
            We only match against your registered details. No password needed.
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

  toggle: {
    flexDirection: "row",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 10,
  },
  toggleText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
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

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
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
