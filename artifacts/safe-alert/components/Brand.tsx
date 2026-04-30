import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

type Props = {
  size?: "sm" | "md" | "lg";
  align?: "center" | "left";
};

export function Brand({ size = "md", align = "center" }: Props) {
  const colors = useColors();
  const dim = size === "lg" ? 56 : size === "md" ? 40 : 32;
  const fontSize = size === "lg" ? 26 : size === "md" ? 20 : 16;

  return (
    <View
      style={[
        styles.row,
        { justifyContent: align === "center" ? "center" : "flex-start" },
      ]}
    >
      <View
        style={[
          styles.shield,
          {
            width: dim,
            height: dim,
            backgroundColor: colors.primary,
            borderRadius: dim * 0.32,
            shadowColor: colors.primary,
          },
        ]}
      >
        <View
          style={[
            styles.dot,
            { backgroundColor: colors.accent, width: dim * 0.34, height: dim * 0.34, borderRadius: dim },
          ]}
        />
      </View>
      <View style={{ marginLeft: 12 }}>
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize,
            color: colors.foreground,
            letterSpacing: -0.4,
          }}
        >
          Safe<Text style={{ color: colors.accent }}>Alert</Text>
        </Text>
        {size !== "sm" && (
          <Text
            style={{
              fontFamily: "Inter_500Medium",
              fontSize: 11,
              color: colors.mutedForeground,
              letterSpacing: 1.2,
              marginTop: 2,
              textTransform: "uppercase",
            }}
          >
            Community Safety
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  shield: {
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 4,
  },
  dot: {
    // accent inner mark
  },
});
