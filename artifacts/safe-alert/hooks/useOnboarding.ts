import { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const KEY = "safealert.onboarded";

async function getFlag(): Promise<boolean> {
  if (Platform.OS === "web") {
    return !!localStorage.getItem(KEY);
  }
  return !!(await SecureStore.getItemAsync(KEY));
}

async function setFlag(): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(KEY, "1");
  } else {
    await SecureStore.setItemAsync(KEY, "1");
  }
}

type State = {
  isReady: boolean;
  hasSeenOnboarding: boolean;
  markOnboardingComplete: () => Promise<void>;
};

export function useOnboarding(): State {
  const [isReady, setIsReady] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  useEffect(() => {
    getFlag().then((seen) => {
      setHasSeenOnboarding(seen);
      setIsReady(true);
    });
  }, []);

  async function markOnboardingComplete() {
    await setFlag();
    setHasSeenOnboarding(true);
  }

  return { isReady, hasSeenOnboarding, markOnboardingComplete };
}
