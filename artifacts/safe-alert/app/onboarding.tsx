import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useOnboarding } from "@/hooks/useOnboarding";
import { useColors } from "@/hooks/useColors";

const { width: SCREEN_W } = Dimensions.get("window");

/* ─── Slide definitions ─────────────────────────────────────── */
type Slide = {
  key: string;
  bg: string;
  icon: keyof typeof Feather.glyphMap;
  iconBg: string;
  iconColor: string;
  tag: string;
  tagColor: string;
  title: string;
  titleHighlight: string;
  body: string;
  features: { icon: keyof typeof Feather.glyphMap; label: string }[];
};

const SLIDES: Slide[] = [
  {
    key: "welcome",
    bg: "#181463",
    icon: "shield",
    iconBg: "rgba(180,151,87,0.22)",
    iconColor: "#B49757",
    tag: "Community Safety",
    tagColor: "#B49757",
    title: "Your safety,\nalways ",
    titleHighlight: "within reach",
    body: "SafeAlert connects you to a network of trained dispatchers the moment you need help — day or night.",
    features: [
      { icon: "clock", label: "24 / 7 emergency coverage" },
      { icon: "map-pin", label: "Precise GPS location sharing" },
      { icon: "users", label: "Trusted community dispatchers" },
    ],
  },
  {
    key: "sos",
    bg: "#B01210",
    icon: "alert-triangle",
    iconBg: "rgba(255,255,255,0.18)",
    iconColor: "#fff",
    tag: "Instant SOS",
    tagColor: "rgba(255,255,255,0.85)",
    title: "One tap.\n",
    titleHighlight: "Help is coming.",
    body: "Press the SOS button or shake your phone 4 times to silently alert the dispatch team and share your exact location.",
    features: [
      { icon: "zap", label: "One-tap SOS trigger" },
      { icon: "smartphone", label: "Shake-to-alert (4× shake)" },
      { icon: "navigation", label: "Real-time location broadcast" },
    ],
  },
  {
    key: "profile",
    bg: "#0D5230",
    icon: "user-check",
    iconBg: "rgba(235,245,238,0.2)",
    iconColor: "#EBF5EE",
    tag: "Your Profile",
    tagColor: "rgba(235,245,238,0.75)",
    title: "Known &\n",
    titleHighlight: "protected.",
    body: "Register once with your name, ID and phone. Dispatchers have your verified details the moment you send an alert.",
    features: [
      { icon: "lock", label: "End-to-end encrypted profile" },
      { icon: "check-circle", label: "Verified identity on every alert" },
      { icon: "refresh-cw", label: "Recover access anytime" },
    ],
  },
];

/* ─── Feature row ───────────────────────────────────────────── */
function FeatureRow({
  icon,
  label,
  delay,
  visible,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  delay: number;
  visible: boolean;
}) {
  const opacity = useSharedValue(0);
  const tx = useSharedValue(20);

  useEffect(() => {
    if (visible) {
      opacity.value = withDelay(delay, withTiming(1, { duration: 360 }));
      tx.value = withDelay(delay, withSpring(0, { damping: 18, stiffness: 180 }));
    } else {
      opacity.value = 0;
      tx.value = 20;
    }
  }, [visible]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: tx.value }],
  }));

  return (
    <Animated.View style={[styles.featureRow, style]}>
      <View style={styles.featureDot}>
        <Feather name={icon} size={14} color="rgba(255,255,255,0.9)" />
      </View>
      <Text style={styles.featureLabel}>{label}</Text>
    </Animated.View>
  );
}

/* ─── Slide illustration ────────────────────────────────────── */
function SlideIllustration({
  slide,
  visible,
}: {
  slide: Slide;
  visible: boolean;
}) {
  const iconScale = useSharedValue(0.7);
  const iconOpacity = useSharedValue(0);
  const bob = useSharedValue(0);
  const ringScale = useSharedValue(0.6);
  const ringOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      iconScale.value = withSpring(1, { damping: 14, stiffness: 160 });
      iconOpacity.value = withTiming(1, { duration: 300 });
      bob.value = withRepeat(
        withSequence(
          withTiming(-8, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
      ringScale.value = withRepeat(
        withTiming(1.6, { duration: 2200, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      );
      ringOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 300 }),
          withTiming(0, { duration: 1900, easing: Easing.out(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      iconScale.value = withTiming(0.7, { duration: 200 });
      iconOpacity.value = withTiming(0, { duration: 150 });
      bob.value = 0;
      ringScale.value = 0.6;
      ringOpacity.value = 0;
    }
  }, [visible]);

  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconScale.value }, { translateY: bob.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  return (
    <View style={styles.illustrationWrap}>
      <View style={[styles.glowCircle, { backgroundColor: "rgba(255,255,255,0.06)" }]} />
      <Animated.View style={[styles.pulseRing, ringStyle]} />
      <Animated.View
        style={[styles.iconCircle, { backgroundColor: slide.iconBg }, iconStyle]}
      >
        <Feather name={slide.icon} size={54} color={slide.iconColor} />
      </Animated.View>
    </View>
  );
}

/* ─── Progress dot ──────────────────────────────────────────── */
function Dot({ active, color }: { active: boolean; color: string }) {
  const w = useSharedValue(active ? 24 : 8);
  const op = useSharedValue(active ? 1 : 0.38);

  useEffect(() => {
    w.value = withSpring(active ? 24 : 8, { damping: 18, stiffness: 220 });
    op.value = withTiming(active ? 1 : 0.38, { duration: 200 });
  }, [active]);

  const style = useAnimatedStyle(() => ({
    width: w.value,
    opacity: op.value,
  }));

  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

/* ─── Onboarding ────────────────────────────────────────────── */
export default function Onboarding() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { markOnboardingComplete } = useOnboarding();

  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  /* Background color cross-fade */
  const bgOpacity = useSharedValue(1);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]?.index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  ).current;

  function goNext() {
    if (activeIndex < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    }
  }

  async function finish() {
    await markOnboardingComplete();
    router.replace("/register");
  }

  const isLast = activeIndex === SLIDES.length - 1;
  const slide = SLIDES[activeIndex];
  const dotColor = slide.tagColor;

  /* Card entrance */
  const footerY = useSharedValue(60);
  const footerOp = useSharedValue(0);
  useEffect(() => {
    footerY.value = withSpring(0, { damping: 18, stiffness: 180 });
    footerOp.value = withTiming(1, { duration: 350 });
  }, []);

  const footerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: footerY.value }],
    opacity: footerOp.value,
  }));

  return (
    <View style={[styles.root, { backgroundColor: slide.bg }]}>
      {/* Skip */}
      {!isLast && (
        <Pressable
          onPress={finish}
          style={[
            styles.skipBtn,
            { top: insets.top + (Platform.OS === "web" ? 60 : 18) },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
        >
          <Text style={styles.skipText}>Skip</Text>
          <Feather name="chevron-right" size={13} color="rgba(255,255,255,0.55)" />
        </Pressable>
      )}

      {/* Slides */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        renderItem={({ item, index }) => (
          <View
            style={[
              styles.slide,
              {
                width: SCREEN_W,
                paddingTop: insets.top + (Platform.OS === "web" ? 80 : 40),
              },
            ]}
          >
            {/* Tag */}
            <View
              style={[
                styles.tagPill,
                { borderColor: "rgba(255,255,255,0.22)", backgroundColor: "rgba(255,255,255,0.1)" },
              ]}
            >
              <View style={[styles.tagDot, { backgroundColor: item.tagColor }]} />
              <Text style={[styles.tagText, { color: item.tagColor }]}>
                {item.tag}
              </Text>
            </View>

            <SlideIllustration slide={item} visible={index === activeIndex} />

            <View style={styles.textBlock}>
              <Text style={styles.title}>
                {item.title}
                <Text style={[styles.titleHL, { color: item.tagColor }]}>
                  {item.titleHighlight}
                </Text>
              </Text>
              <Text style={styles.body}>{item.body}</Text>

              <View style={styles.featureList}>
                {item.features.map((f: Slide["features"][number], i: number) => (
                  <FeatureRow
                    key={f.label}
                    icon={f.icon}
                    label={f.label}
                    delay={i * 90}
                    visible={index === activeIndex}
                  />
                ))}
              </View>
            </View>
          </View>
        )}
      />

      {/* Footer */}
      <Animated.View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 40 : 28) },
          footerStyle,
        ]}
      >
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <Dot key={i} active={i === activeIndex} color={dotColor} />
          ))}
        </View>

        {isLast ? (
          <Pressable
            onPress={finish}
            style={({ pressed }) => [
              styles.ctaBtn,
              { backgroundColor: "#fff", opacity: pressed ? 0.9 : 1, borderRadius: colors.radius },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Create my profile"
          >
            <Feather name="user-plus" size={18} color={slide.bg} />
            <Text style={[styles.ctaText, { color: slide.bg }]}>
              Create my profile
            </Text>
            <Feather name="arrow-right" size={18} color={slide.bg} />
          </Pressable>
        ) : (
          <Pressable
            onPress={goNext}
            style={({ pressed }) => [
              styles.nextBtn,
              {
                borderColor: "rgba(255,255,255,0.3)",
                backgroundColor: "rgba(255,255,255,0.12)",
                opacity: pressed ? 0.8 : 1,
                borderRadius: colors.radius,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Continue to next slide"
          >
            <Text style={styles.nextText}>Continue</Text>
            <Feather name="arrow-right" size={15} color="rgba(255,255,255,0.9)" />
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  skipBtn: {
    position: "absolute",
    right: 20,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  skipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
  },

  slide: {
    alignItems: "center",
    paddingHorizontal: 28,
    paddingBottom: 140,
    gap: 0,
  },
  tagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 28,
    alignSelf: "flex-start",
  },
  tagDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  tagText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11.5,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },

  illustrationWrap: {
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 36,
  },
  glowCircle: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  pulseRing: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.45)",
  },
  iconCircle: {
    width: 114,
    height: 114,
    borderRadius: 57,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.18)",
  },

  textBlock: { width: "100%", gap: 12 },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 33,
    color: "#fff",
    letterSpacing: -0.7,
    lineHeight: 40,
  },
  titleHL: { fontFamily: "Inter_700Bold" },
  body: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "rgba(255,255,255,0.62)",
    lineHeight: 23,
  },

  featureList: { gap: 11, marginTop: 6 },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  featureDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.13)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  featureLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    flex: 1,
  },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 28,
    paddingTop: 20,
    gap: 18,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  dots: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { height: 8, borderRadius: 4 },

  ctaBtn: {
    width: "100%",
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 12,
  },
  ctaText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    flex: 1,
    textAlign: "center",
  },
  nextBtn: {
    width: "100%",
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
  },
  nextText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "rgba(255,255,255,0.9)",
  },
});
