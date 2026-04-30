import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import {
  getGetUserUrl,
  useGetUser,
  useRegisterUser,
  type RegisterUserInput,
  type User,
} from "@workspace/api-client-react";

const STORAGE_KEY = "safealert.userId";

async function getStoredUserId(): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(STORAGE_KEY);
}

async function setStoredUserId(value: string | null): Promise<void> {
  if (Platform.OS === "web") {
    try {
      if (value) globalThis.localStorage?.setItem(STORAGE_KEY, value);
      else globalThis.localStorage?.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    return;
  }
  if (value) await SecureStore.setItemAsync(STORAGE_KEY, value);
  else await SecureStore.deleteItemAsync(STORAGE_KEY);
}

type AuthContextValue = {
  isReady: boolean;
  userId: string | null;
  user: User | null;
  isUserLoading: boolean;
  registering: boolean;
  registerError: string | null;
  register: (input: RegisterUserInput) => Promise<User>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await getStoredUserId();
      if (!cancelled) {
        setUserId(stored);
        setIsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const userQuery = useGetUser(userId ?? "", {
    query: {
      enabled: !!userId,
      // Re-run when userId changes
      queryKey: userId ? [getGetUserUrl(userId)] : ["user", "none"],
    },
  });

  const registerMutation = useRegisterUser();

  const register = useCallback(
    async (input: RegisterUserInput): Promise<User> => {
      setRegisterError(null);
      try {
        const created = await registerMutation.mutateAsync({ data: input });
        await setStoredUserId(created.id);
        setUserId(created.id);
        return created;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Registration failed";
        setRegisterError(msg);
        throw err;
      }
    },
    [registerMutation],
  );

  const signOut = useCallback(async () => {
    await setStoredUserId(null);
    setUserId(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isReady,
      userId,
      user: userQuery.data ?? null,
      isUserLoading: !!userId && userQuery.isLoading,
      registering: registerMutation.isPending,
      registerError,
      register,
      signOut,
    }),
    [
      isReady,
      userId,
      userQuery.data,
      userQuery.isLoading,
      registerMutation.isPending,
      registerError,
      register,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
