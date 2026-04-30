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

import { Brand } from "@/components/Brand";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

type Field = "fullName" | "phoneNumber" | "nationalId" | "email";

const FIELDS: {
  key: Field;
  label: string;
  placeholder: string;
  icon: keyof typeof Feather.glyphMap;
  keyboardType?: "default" | "phone-pad" | "email-address" | "number-pad";
  autoCapitalize?: "none" | "words";
}[] = [
  {
    key: "fullName",
    label: "Full name",
    placeholder: "Jane Doe",
    icon: "user",
    autoCapitalize: "words",
  },
  {
    key: "phoneNumber",
    label: "Phone number",
    placeholder: "+1 555 123 4567",
    icon: "phone",
    keyboardType: "phone-pad",
  },
  {
    key: "nationalId",
    label: "National ID",
    placeholder: "AB1234567",
    icon: "credit-card",
    autoCapitalize: "none",
  },
  {
    key: "email",
    label: "Email",
    placeholder: "you@example.com",
    icon: "mail",
    keyboardType: "email-address",
    autoCapitalize: "none",
  },
];

export default function Register() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { register, registering, registerError } = useAuth();

  const [values, setValues] = useState<Record<Field, string>>({
    fullName: "",
    phoneNumber: "",
    nationalId: "",
    email: "",
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});

  function update(key: Field, v: string) {
    setValues((s) => ({ ...s, [key]: v }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const e: Partial<Record<Field, string>> = {};
    if (values.fullName.trim().length < 2) e.fullName = "Enter your full name";
    if (values.phoneNumber.replace(/\D/g, "").length < 7)
      e.phoneNumber = "Enter a valid phone number";
    if (values.nationalId.trim().length < 3)
      e.nationalId = "Enter your National ID";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
      e.email = "Enter a valid email";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit() {
    if (!validate()) return;
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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.scroll,
        {
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 24),
          paddingBottom:
            insets.bottom + (Platform.OS === "web" ? 34 : 24) + 24,
        },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Brand size="lg" align="left" />

      <View style={{ marginTop: 28, marginBottom: 24 }}>
        <Text style={[styles.h1, { color: colors.foreground }]}>
          Create your safety profile
        </Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          We use this to dispatch help and identify you to first responders
          when you trigger an emergency.
        </Text>
      </View>

      <View style={{ gap: 16 }}>
        {FIELDS.map((f) => (
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
              <Feather
                name={f.icon}
                size={18}
                color={colors.mutedForeground}
              />
              <TextInput
                value={values[f.key]}
                onChangeText={(v) => update(f.key, v)}
                placeholder={f.placeholder}
                placeholderTextColor={colors.mutedForeground}
                keyboardType={f.keyboardType}
                autoCapitalize={f.autoCapitalize}
                style={[styles.input, { color: colors.foreground }]}
              />
            </View>
            {errors[f.key] && (
              <Text
                style={[styles.errorText, { color: colors.destructive }]}
              >
                {errors[f.key]}
              </Text>
            )}
          </View>
        ))}
      </View>

      {registerError && (
        <View
          style={[
            styles.errorBanner,
            {
              backgroundColor: colors.destructive + "14",
              borderRadius: colors.radius,
            },
          ]}
        >
          <Feather
            name="alert-circle"
            size={16}
            color={colors.destructive}
          />
          <Text
            style={[styles.errorBannerText, { color: colors.destructive }]}
          >
            {registerError}
          </Text>
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create profile"
        disabled={registering}
        onPress={onSubmit}
        style={({ pressed }) => [
          styles.cta,
          {
            backgroundColor: colors.primary,
            borderRadius: colors.radius,
            opacity: pressed || registering ? 0.9 : 1,
          },
        ]}
      >
        {registering ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <>
            <Text
              style={[
                styles.ctaText,
                { color: colors.primaryForeground },
              ]}
            >
              Activate SafeAlert
            </Text>
            <Feather
              name="arrow-right"
              size={18}
              color={colors.primaryForeground}
            />
          </>
        )}
      </Pressable>

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
        <Feather name="lock" size={14} color={colors.accent} />
        <Text
          style={[
            styles.fineprintText,
            { color: colors.mutedForeground },
          ]}
        >
          Your details are stored securely and only used by authorized
          dispatchers responding to your alerts.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 24,
    flexGrow: 1,
  },
  h1: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  sub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14.5,
    lineHeight: 21,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    height: 54,
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
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    marginTop: 16,
  },
  errorBannerText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    flex: 1,
  },
  cta: {
    marginTop: 24,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  ctaText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    letterSpacing: 0.2,
  },
  fineprint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    marginTop: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  fineprintText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
});
