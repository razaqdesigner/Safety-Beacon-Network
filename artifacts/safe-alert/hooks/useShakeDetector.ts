import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { Accelerometer } from "expo-sensors";

type Options = {
  enabled?: boolean;
  threshold?: number;
  shakesRequired?: number;
  windowMs?: number;
  cooldownMs?: number;
  onShake: () => void;
};

/**
 * Detect a vigorous shake gesture: `shakesRequired` distinct shake spikes
 * within a rolling `windowMs` time window. After firing it imposes a
 * `cooldownMs` so the same motion can't re-trigger immediately.
 *
 * Disabled on web (no accelerometer access in iframe preview).
 */
export function useShakeDetector({
  enabled = true,
  threshold = 1.8,
  shakesRequired = 4,
  windowMs = 3000,
  cooldownMs = 4000,
  onShake,
}: Options): void {
  const callbackRef = useRef(onShake);
  useEffect(() => {
    callbackRef.current = onShake;
  }, [onShake]);

  useEffect(() => {
    if (!enabled || Platform.OS === "web") return;

    let lastSpike = 0;
    let cooldownUntil = 0;
    let recentSpikes: number[] = [];

    Accelerometer.setUpdateInterval(60);

    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const now = Date.now();
      if (now < cooldownUntil) return;

      const magnitude = Math.sqrt(x * x + y * y + z * z);
      // Subtract gravity baseline (~1g)
      const force = Math.abs(magnitude - 1);

      if (force > threshold && now - lastSpike > 180) {
        lastSpike = now;
        recentSpikes.push(now);
        recentSpikes = recentSpikes.filter((t) => now - t <= windowMs);

        if (recentSpikes.length >= shakesRequired) {
          recentSpikes = [];
          cooldownUntil = now + cooldownMs;
          callbackRef.current();
        }
      }
    });

    return () => {
      sub.remove();
    };
  }, [enabled, threshold, shakesRequired, windowMs, cooldownMs]);
}
