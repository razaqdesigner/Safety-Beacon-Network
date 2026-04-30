import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";

type Props = {
  visible: boolean;
  loading?: boolean;
  onYes: () => void;
  onNo: () => void;
};

export function Confirmation({ visible, loading, onYes, onNo }: Props) {
  const colors = useColors();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onNo}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderRadius: colors.radius,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: colors.destructive + "1A" },
            ]}
          >
            <Feather
              name="alert-triangle"
              size={28}
              color={colors.destructive}
            />
          </View>

          <Text
            style={[styles.title, { color: colors.foreground }]}
          >
            Are you in distress?
          </Text>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>
            Tap Yes to share your precise location with the safety dispatch
            team. Tap No if this was a false alarm.
          </Text>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel emergency"
              disabled={loading}
              onPress={onNo}
              style={({ pressed }) => [
                styles.btn,
                {
                  backgroundColor: colors.secondary,
                  borderRadius: colors.radius,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Feather name="x" size={18} color={colors.primary} />
              <Text
                style={[styles.btnText, { color: colors.primary }]}
              >
                No, I'm okay
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Confirm emergency and share location"
              disabled={loading}
              onPress={onYes}
              style={({ pressed }) => [
                styles.btn,
                {
                  backgroundColor: colors.destructive,
                  borderRadius: colors.radius,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color={colors.destructiveForeground} />
              ) : (
                <>
                  <Feather
                    name="map-pin"
                    size={18}
                    color={colors.destructiveForeground}
                  />
                  <Text
                    style={[
                      styles.btnText,
                      { color: colors.destructiveForeground },
                    ]}
                  >
                    Yes, send help
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 8, 51, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    padding: 28,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 28,
    elevation: 20,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  body: {
    fontFamily: "Inter_400Regular",
    fontSize: 14.5,
    lineHeight: 21,
    marginBottom: 24,
  },
  actions: {
    gap: 10,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  btnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
});
