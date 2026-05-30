import React, { useRef, useState } from "react";
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
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

type Field = "fullName" | "phoneNumber" | "nationalId" | "email";

type StepConfig = {
  title: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
  fields: {
    key: Field;
    label: string;
    placeholder: string;
    icon: keyof typeof Feather.glyphMap;
    keyboardType?: "default" | "phone-pad" | "email-address";
    autoCapitalize?: "none" | "words";
    autoComplete?: "name" | "tel" | "off" | "email";
  }[];
};

const STEPS: StepConfig[] = [
  {
    title: "Who are you?",
    subtitle: "Your identity helps dispatchers verify and assist you faster.",
    icon: "user",
    fields: [
      {
        key: "fullName",
        label: "Full name",
        placeholder: "Jane Doe",
        icon: "user",
        autoCapitalize: "words",
        autoComplete: "name",
      },
      {
        key: "nationalId",
        label: "National ID",
        placeholder: "AB1234567",
        icon: "credit-card",
        autoCapitalize: "none",
        autoComplete: "off",
      },
    ],
  },
  {
    title: "How do we reach you?",
    subtitle: "Your contact details are only used during active emergency responses.",
    icon: "phone",
    fields: [
      {
        key: "phoneNumber",
        label: "Phone number",
        placeholder: "+1 555 123 4567",
        icon: "phone",
        keyboardType: "phone-pad",
        autoComplete: "tel",
      },
      {
        key: "email",
        label: "Email address",
        placeholder: "you@example.com",
        icon: "mail",
        keyboardType: "email-address",
        autoCapitalize: "none",
        autoComplete: "email",
      },
    ],
  },
];

const TOTAL_STEPS = 3; // 2 input steps + 1 review step

export default function Register() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { register, registering, registerError } = useAuth();

  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<Field, string>>({
    fullName: "",
    phoneNumber: "",
    nationalId: "",
    email: "",
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});

  // Slide animation — one shared value tracking the current step index
  const slideX = useSharedValue(0);

  function update(key: Field, v: string) {
    setValues((s) => ({ ...s, [key]: v }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validateStep(idx: number): boolean {
    if (idx >= STEPS.length) return true; // review step, no new validation
    const e: Partial<Record<Field, string>> = {};
    const stepFields = STEPS[idx].fields;
    stepFields.forEach((f) => {
      if (f.key === "fullName" && values.fullName.trim().length < 2)
        e.fullName = "Enter your full name";
      if (f.key === "nationalId" && values.nationalId.trim().length < 3)
        e.nationalId = "Enter your National ID";
      if (
        f.key === "phoneNumber" &&
        values.phoneNumber.replace(/\D/g, "").length < 7
      )
        e.phoneNumber = "Enter a valid phone number";
      if (
        f.key === "email" &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())
      )
        e.email = "Enter a valid email";
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function goNext() {
    if (!validateStep(step)) return;
    const next = step + 1;
    slideX.value = withSpring(next, { damping: 22, stiffness: 200 });
    setStep(next);
  }

  function goBack() {
    const prev = step - 1;
    slideX.value = withSpring(prev, { damping: 22, stiffness: 200 });
    setStep(prev);
  }

  async function onSubmit() {
    try {
      await register({
        fullName: values.fullName.trim(),
        phoneNumber: values.phoneNumber.trim(),
        nationalId: values.nationalId.trim(),
        email: values.email.trim().toLowerCase(),
      });
      router.replace("/");
    } catch {
      // surfaced via registerError
    }
  }

  const isReviewStep = step === STEPS.length;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Hero header ── */}
      <View
        style={[
          styles.hero,
          {
            backgroundColor: colors.primary,
            paddingTop: insets.top + (Platform.OS === "web" ? 72 : 24),
          },
        ]}
      >
        {/* Back button */}
        {step > 0 && (
          <Pressable
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [
              styles.backBtn,
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.75)" />
          </Pressable>
        )}

        {/* Title area */}
        <View style={styles.heroText}>
          <Text style={styles.heroEyebrow}>
            Safe<Text style={{ color: colors.accent }}>Alert</Text>
          </Text>
          <Text style={styles.heroTitle}>Create your safety profile</Text>
          <Text style={styles.heroSub}>
            Helps dispatchers identify and assist you during emergencies
          </Text>
        </View>

        {/* Step progress */}
        <StepProgress current={step} total={TOTAL_STEPS} colors={colors} />
      </View>

      {/* ── Form body ── */}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.body,
          {
            paddingBottom:
              insets.bottom + (Platform.OS === "web" ? 34 : 24) + 32,
          },
        ]}
      >
        {/* Step label */}
        <View style={styles.stepLabel}>
          <View
            style={[styles.stepNumBadge, { backgroundColor: colors.primary + "14" }]}
          >
            <Text style={[styles.stepNumText, { color: colors.primary }]}>
              Step {step + 1} of {TOTAL_STEPS}
            </Text>
          </View>
          <Text style={[styles.stepTitle, { color: colors.foreground }]}>
            {isReviewStep
              ? "Review your details"
              : STEPS[step].title}
          </Text>
          <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>
            {isReviewStep
              ? "Confirm everything looks right before activating."
              : STEPS[step].subtitle}
          </Text>
        </View>

        {/* Fields or review */}
        {isReviewStep ? (
          <ReviewPanel values={values} colors={colors} onEdit={(s) => {
            slideX.value = withSpring(s, { damping: 22, stiffness: 200 });
            setStep(s);
          }} />
        ) : (
          <View style={styles.fields}>
            {STEPS[step].fields.map((f) => (
              <View key={f.key}>
                <Text style={[styles.label, { color: colors.foreground }]}>
                  {f.label}
                </Text>
                <View
                  style={[
                    styles.inputWrap,
                    {
                      backgroundColor: colors.card,
                      borderColor: errors[f.key]
                        ? colors.destructive
                        : colors.border,
                      borderRadius: colors.radius,
                    },
                  ]}
                >
                  <Feather name={f.icon} size={18} color={colors.mutedForeground} />
                  <TextInput
                    value={values[f.key]}
                    onChangeText={(v) => update(f.key, v)}
                    placeholder={f.placeholder}
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType={f.keyboardType}
                    autoCapitalize={f.autoCapitalize}
                    autoComplete={f.autoComplete as "off"}
                    style={[styles.input, { color: colors.foreground }]}
                  />
                </View>
                {errors[f.key] && (
                  <Text style={[styles.errorText, { color: colors.destructive }]}>
                    {errors[f.key]}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* API error */}
        {registerError && isReviewStep && (
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
            <Text style={[styles.errorBannerText, { color: colors.destructive }]}>
              {registerError}
            </Text>
          </View>
        )}

        {/* CTA */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isReviewStep ? "Activate SafeAlert" : "Continue"}
          disabled={registering}
          onPress={isReviewStep ? onSubmit : goNext}
          style={({ pressed }) => [
            styles.cta,
            {
              backgroundColor: isReviewStep ? colors.accent : colors.primary,
              borderRadius: colors.radius,
              opacity: pressed || registering ? 0.88 : 1,
            },
          ]}
        >
          {registering ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.ctaText}>
                {isReviewStep ? "Activate SafeAlert" : "Continue"}
              </Text>
              <Feather
                name={isReviewStep ? "shield" : "arrow-right"}
                size={18}
                color="#fff"
              />
            </>
          )}
        </Pressable>

        {/* Trust note */}
        <View
          style={[
            styles.fineprint,
            {
              backgroundColor: colors.card,
              borderRadius: colors.radius,
              borderColor: colors.border,
            },
          ]}
        >
          <Feather name="lock" size={13} color={colors.accent} />
          <Text style={[styles.fineprintText, { color: colors.mutedForeground }]}>
            Encrypted and only shared with authorized emergency dispatchers
          </Text>
        </View>

        {/* Recovery link — only shown on step 0 */}
        {step === 0 && (
          <View style={styles.recoveryRow}>
            <View style={[styles.recoveryDividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.recoveryDividerText, { color: colors.mutedForeground }]}>or</Text>
            <View style={[styles.recoveryDividerLine, { backgroundColor: colors.border }]} />
          </View>
        )}
        {step === 0 && (
          <Link href="/lookup" asChild>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, alignItems: "center" }]}
            >
              <Text style={[styles.recoveryText, { color: colors.mutedForeground }]}>
                Already registered?{" "}
                <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>
                  Recover your account
                </Text>
              </Text>
            </Pressable>
          </Link>
        )}
      </ScrollView>
    </View>
  );
}

/* ── Step progress dots ── */
function StepProgress({
  current,
  total,
  colors,
}: {
  current: number;
  total: number;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.progressRow}>
      {Array.from({ length: total }).map((_, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <View key={i} style={styles.progressSegWrap}>
            <View
              style={[
                styles.progressSeg,
                {
                  backgroundColor:
                    done
                      ? colors.accent
                      : active
                      ? "rgba(255,255,255,0.9)"
                      : "rgba(255,255,255,0.25)",
                  flex: active ? 2 : 1,
                },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

/* ── Review panel ── */
function ReviewPanel({
  values,
  colors,
  onEdit,
}: {
  values: Record<Field, string>;
  colors: ReturnType<typeof useColors>;
  onEdit: (step: number) => void;
}) {
  const rows: { label: string; value: string; icon: keyof typeof Feather.glyphMap; editStep: number }[] = [
    { label: "Full name", value: values.fullName, icon: "user", editStep: 0 },
    { label: "National ID", value: values.nationalId, icon: "credit-card", editStep: 0 },
    { label: "Phone number", value: values.phoneNumber, icon: "phone", editStep: 1 },
    { label: "Email", value: values.email, icon: "mail", editStep: 1 },
  ];

  return (
    <View
      style={[
        styles.reviewCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
        },
      ]}
    >
      {rows.map((row, i) => (
        <View key={row.label}>
          {i > 0 && (
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
          )}
          <View style={styles.reviewRow}>
            <View
              style={[
                styles.reviewIconWrap,
                { backgroundColor: colors.primary + "12" },
              ]}
            >
              <Feather name={row.icon} size={15} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.reviewLabel, { color: colors.mutedForeground }]}>
                {row.label}
              </Text>
              <Text style={[styles.reviewValue, { color: colors.foreground }]}>
                {row.value || "—"}
              </Text>
            </View>
            <Pressable
              onPress={() => onEdit(row.editStep)}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${row.label}`}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Text style={[styles.editBtn, { color: colors.accent }]}>Edit</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  /* Hero */
  hero: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  backBtn: {
    marginBottom: 12,
    alignSelf: "flex-start",
    padding: 4,
  },
  heroText: { marginBottom: 20 },
  heroEyebrow: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "rgba(255,255,255,0.75)",
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  heroTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: "#fff",
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  heroSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.55)",
    lineHeight: 20,
  },

  /* Progress */
  progressRow: {
    flexDirection: "row",
    gap: 6,
    height: 4,
  },
  progressSegWrap: {
    flex: 1,
    flexDirection: "row",
  },
  progressSeg: {
    height: 4,
    borderRadius: 2,
  },

  /* Body */
  body: {
    paddingHorizontal: 24,
    paddingTop: 28,
    gap: 20,
    flexGrow: 1,
  },

  /* Step label */
  stepLabel: { gap: 6 },
  stepNumBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 2,
  },
  stepNumText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  stepTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    letterSpacing: -0.5,
  },
  stepSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },

  /* Fields */
  fields: { gap: 16 },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    marginBottom: 8,
    marginLeft: 2,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    paddingVertical: 0,
  },
  errorText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },

  /* Review */
  reviewCard: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  reviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  reviewIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  reviewValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  editBtn: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 18 },

  /* Error */
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
  },
  errorBannerText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    flex: 1,
  },

  /* CTA */
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
    letterSpacing: 0.1,
  },

  /* Fineprint */
  fineprint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  fineprintText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },

  /* Recovery */
  recoveryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  recoveryDividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  recoveryDividerText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  recoveryText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
});
