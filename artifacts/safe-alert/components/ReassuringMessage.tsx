import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

type Props = {
  visible: boolean;
  onDismiss: () => void;
};

export function ReassuringMessage({ visible, onDismiss }: Props) {
  const colors = useColors();
  const opacity = useSharedValue(0);
  const translate = useSharedValue(20);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, {
        duration: 220,
        easing: Easing.out(Easing.ease),
      });
      translate.value = withTiming(0, {
        duration: 260,
        easing: Easing.out(Easing.ease),
      });
      const timer = setTimeout(() => onDismiss(), 4500);
      return () => clearTimeout(timer);
    } else {
      opacity.value = withTiming(0, { duration: 160 });
      translate.value = withTiming(20, { duration: 160 });
      return undefined;
    }
  }, [visible, opacity, translate, onDismiss]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translate.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, animStyle]}
    >
      <View
        style={[
          styles.toast,
          {
            backgroundColor: colors.primary,
            borderRadius: colors.radius,
          },
        ]}
      >
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: colors.accent },
          ]}
        >
          <Feather name="heart" size={18} color={colors.primaryForeground} />
        </View>
        <View style={styles.text}>
          <Text style={[styles.title, { color: colors.primaryForeground }]}>
            Glad you're safe.
          </Text>
          <Text style={[styles.body, { color: "rgba(255,255,255,0.85)" }]}>
            No location was shared. Take a breath — we're here whenever you
            need us.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss reassuring message"
          onPress={onDismiss}
          hitSlop={12}
          style={styles.close}
        >
          <Feather name="x" size={18} color="rgba(255,255,255,0.8)" />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 28,
    alignItems: "center",
  },
  toast: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "100%",
    maxWidth: 460,
    padding: 16,
    gap: 14,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 22,
    elevation: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    flex: 1,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    marginBottom: 2,
  },
  body: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  close: {
    padding: 4,
  },
});
