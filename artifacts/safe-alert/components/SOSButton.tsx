import React, { useEffect } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

type Props = {
  onPress: (e: GestureResponderEvent) => void;
  disabled?: boolean;
  label?: string;
};

export function SOSButton({ onPress, disabled, label = "SOS" }: Props) {
  const colors = useColors();
  const pulse = useSharedValue(0);
  const press = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.out(Easing.ease) }),
        withTiming(0, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, [pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.55 }],
    opacity: 0.55 - pulse.value * 0.55,
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.85 }],
    opacity: 0.35 - pulse.value * 0.35,
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.value }],
  }));

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          { borderColor: colors.destructive, backgroundColor: colors.destructive },
          ring2Style,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          { borderColor: colors.destructive, backgroundColor: colors.destructive },
          ringStyle,
        ]}
      />
      <Animated.View style={[buttonStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Trigger emergency alert"
          disabled={disabled}
          onPressIn={() => {
            press.value = withTiming(0.94, { duration: 90 });
          }}
          onPressOut={() => {
            press.value = withTiming(1, { duration: 140 });
          }}
          onPress={onPress}
          style={[
            styles.button,
            {
              backgroundColor: colors.destructive,
              opacity: disabled ? 0.7 : 1,
              shadowColor: colors.destructive,
            },
          ]}
        >
          <View
            style={[
              styles.inner,
              {
                borderColor: "rgba(255,255,255,0.35)",
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: colors.destructiveForeground },
              ]}
            >
              {label}
            </Text>
            <Text
              style={[
                styles.sub,
                { color: "rgba(255,255,255,0.85)" },
              ]}
            >
              Tap to alert
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const SIZE = 240;

const styles = StyleSheet.create({
  wrap: {
    width: SIZE + 80,
    height: SIZE + 80,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 0,
  },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 26,
    elevation: 14,
  },
  inner: {
    width: SIZE - 28,
    height: SIZE - 28,
    borderRadius: (SIZE - 28) / 2,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: "Inter_700Bold",
    fontSize: 56,
    letterSpacing: 6,
  },
  sub: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginTop: 6,
  },
});
