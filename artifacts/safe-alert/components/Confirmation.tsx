import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";

type Props = {
  visible: boolean;
  loading?: boolean;
  onYes: () => void;
  onNo: () => void;
};

/* ── Animated pulse ring ── */
function PulseRing({
  delay,
  color,
  size,
}: {
  delay: number;
  color: string;
  size: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    position: "absolute",
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 2,
    borderColor: color,
    opacity: interpolate(progress.value, [0, 0.6, 1], [0.7, 0.2, 0]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.6, 1.6]) }],
  }));

  return <Animated.View style={style} />;
}

/* ── Animated press button ── */
function AnimatedButton({
  onPress,
  disabled,
  style: styleProp,
  children,
  accessibilityRole,
  accessibilityLabel,
}: {
  onPress: () => void;
  disabled?: boolean;
  style: object;
  children: React.ReactNode;
  accessibilityRole?: "button";
  accessibilityLabel?: string;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPressIn={() => {
        scale.value = withSpring(0.95, { damping: 18, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 250 });
      }}
      onPress={onPress}
    >
      <Animated.View style={[styleProp, animStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

export function Confirmation({ visible, loading, onYes, onNo }: Props) {
  const colors = useColors();

  /* Card entrance */
  const cardScale = useSharedValue(0.82);
  const cardOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      cardScale.value = withSpring(1, { damping: 18, stiffness: 200 });
      cardOpacity.value = withTiming(1, { duration: 200 });
    } else {
      cardScale.value = withTiming(0.88, { duration: 160 });
      cardOpacity.value = withTiming(0, { duration: 160 });
    }
  }, [visible]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));

  /* Icon bob */
  const iconBob = useSharedValue(0);
  useEffect(() => {
    if (visible) {
      iconBob.value = withRepeat(
        withSequence(
          withTiming(-4, { duration: 600, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 600, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
    } else {
      iconBob.value = 0;
    }
  }, [visible]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: iconBob.value }],
  }));

  /* Yes button glow pulse */
  const glowOpacity = useSharedValue(0.3);
  useEffect(() => {
    if (visible) {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 900, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    }
  }, [visible]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const DANGER = "#E0251A";
  const DANGER_SOFT = "#FFF0EF";
  const SAFE_GREEN = "#1A7A4A";
  const SAFE_SOFT = "#EDFBF3";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onNo}
    >
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderRadius: colors.radius + 4,
              overflow: "hidden",
            },
            cardStyle,
          ]}
        >
          {/* ── Colored header band ── */}
          <View style={[styles.header, { backgroundColor: DANGER }]}>
            {/* decorative corner circles */}
            <View style={[styles.headerCircle, styles.headerCircleTL, { backgroundColor: "rgba(255,255,255,0.08)" }]} />
            <View style={[styles.headerCircle, styles.headerCircleBR, { backgroundColor: "rgba(255,255,255,0.06)" }]} />

            {/* Pulsing rings + icon */}
            <View style={styles.iconCluster}>
              <PulseRing delay={0} color="rgba(255,255,255,0.6)" size={90} />
              <PulseRing delay={600} color="rgba(255,255,255,0.4)" size={90} />
              <PulseRing delay={1200} color="rgba(255,255,255,0.25)" size={90} />

              <Animated.View
                style={[
                  styles.iconWrap,
                  { backgroundColor: "rgba(255,255,255,0.2)" },
                  iconStyle,
                ]}
              >
                <Feather name="alert-triangle" size={32} color="#fff" />
              </Animated.View>
            </View>

            <Text style={styles.headerTitle}>Are you in distress?</Text>
            <Text style={styles.headerSub}>
              Your safety team is standing by
            </Text>
          </View>

          {/* ── Body ── */}
          <View style={styles.body}>
            <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>
              Tap{" "}
              <Text style={{ color: DANGER, fontFamily: "Inter_600SemiBold" }}>
                Yes, send help
              </Text>{" "}
              to share your precise location with dispatchers immediately.
              Tap{" "}
              <Text style={{ color: SAFE_GREEN, fontFamily: "Inter_600SemiBold" }}>
                I'm okay
              </Text>{" "}
              if this was accidental.
            </Text>

            {/* ── Yes button ── */}
            <View style={styles.yesWrap}>
              {/* glow layer */}
              <Animated.View
                style={[
                  styles.yesGlow,
                  { backgroundColor: DANGER, borderRadius: colors.radius + 2 },
                  glowStyle,
                ]}
              />
              <AnimatedButton
                accessibilityRole="button"
                accessibilityLabel="Confirm emergency and share location"
                disabled={loading}
                onPress={onYes}
                style={[
                  styles.btn,
                  styles.yesBtn,
                  {
                    backgroundColor: DANGER,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <View style={styles.btnIconWrap}>
                      <Feather name="navigation" size={18} color="#fff" />
                    </View>
                    <Text style={[styles.btnText, { color: "#fff" }]}>
                      Yes, send help
                    </Text>
                  </>
                )}
              </AnimatedButton>
            </View>

            {/* ── No button ── */}
            <AnimatedButton
              accessibilityRole="button"
              accessibilityLabel="Cancel emergency"
              disabled={loading}
              onPress={onNo}
              style={[
                styles.btn,
                styles.noBtn,
                {
                  backgroundColor: SAFE_SOFT,
                  borderRadius: colors.radius,
                  borderColor: SAFE_GREEN + "40",
                },
              ]}
            >
              <View style={[styles.btnIconWrap, { backgroundColor: SAFE_GREEN + "22" }]}>
                <Feather name="check" size={18} color={SAFE_GREEN} />
              </View>
              <Text style={[styles.btnText, { color: SAFE_GREEN }]}>
                I'm okay
              </Text>
            </AnimatedButton>

            {/* Reassurance note */}
            <View
              style={[
                styles.note,
                {
                  backgroundColor: colors.background,
                  borderRadius: colors.radius - 4,
                  borderColor: colors.border,
                },
              ]}
            >
              <Feather name="shield" size={13} color={colors.accent} />
              <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
                False alerts can be dismissed — no penalty, your safety always comes first.
              </Text>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 8, 51, 0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 20 },
    shadowRadius: 40,
    elevation: 30,
  },

  /* Header */
  header: {
    alignItems: "center",
    paddingTop: 36,
    paddingBottom: 28,
    paddingHorizontal: 24,
    gap: 10,
    overflow: "hidden",
  },
  headerCircle: {
    position: "absolute",
    borderRadius: 9999,
  },
  headerCircleTL: {
    width: 130,
    height: 130,
    top: -50,
    left: -40,
  },
  headerCircleBR: {
    width: 160,
    height: 160,
    bottom: -70,
    right: -50,
  },
  iconCluster: {
    width: 90,
    height: 90,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: "#fff",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  headerSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
  },

  /* Body */
  body: {
    padding: 24,
    gap: 12,
  },
  bodyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14.5,
    lineHeight: 22,
    marginBottom: 4,
  },

  /* Yes button */
  yesWrap: {
    position: "relative",
  },
  yesGlow: {
    position: "absolute",
    inset: -6,
    borderRadius: 20,
    zIndex: 0,
    transform: [{ scaleY: 0.6 }],
    top: 6,
    bottom: -8,
    left: 6,
    right: 6,
  },
  yesBtn: {
    zIndex: 1,
  },

  /* Buttons */
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "transparent",
  },
  noBtn: {
    borderWidth: 1.5,
  },
  btnIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  btnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15.5,
    letterSpacing: 0.1,
  },

  /* Note */
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  noteText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
});
