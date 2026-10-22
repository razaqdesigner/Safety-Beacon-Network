import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetUserUrl,
  logout,
  setAuthTokenGetter,
  startRecovery as startRecoveryRequest,
  useGetUser,
  useRegisterUser,
  verifyRecovery as verifyRecoveryRequest,
  type RecoveryChallenge,
  type RegisterUserInput,
  type User,
} from "@workspace/api-client-react";

const USER_ID_KEY = "safealert.userId";
const TOKEN_KEY = "safealert.token";

// Registered once at module load so even the very first request carries it.
let currentToken: string | null = null;
setAuthTokenGetter(() => currentToken);

async function getStored(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

async function setStored(key: string, value: string | null): Promise<void> {
  if (Platform.OS === "web") {
    try {
      if (value) globalThis.localStorage?.setItem(key, value);
      else globalThis.localStorage?.removeItem(key);
    } catch {
      // ignore
    }
    return;
  }
  if (value) await SecureStore.setItemAsync(key, value);
  else await SecureStore.deleteItemAsync(key);
}

function errorStatus(err: unknown): number | null {
  const status = (err as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : null;
}

/** The server's `{ error }` message, without the "HTTP 409 Conflict:" prefix. */
function errorMessage(err: unknown, fallback: string): string {
  const data = (err as { data?: unknown } | null)?.data;
  const msg = (data as { error?: unknown } | null)?.error;
  return typeof msg === "string" && msg ? msg : fallback;
}

export type RecoverError = { status: number | null; message: string };

type AuthContextValue = {
  isReady: boolean;
  userId: string | null;
  user: User | null;
  isUserLoading: boolean;
  registering: boolean;
  registerError: string | null;
  recovering: boolean;
  recoverError: RecoverError | null;
  register: (input: RegisterUserInput) => Promise<User>;
  /** Sends a one-time code to the phone or email on file. */
  startRecovery: (params: { phone?: string; nationalId?: string }) => Promise<RecoveryChallenge>;
  /** Sends a fresh code using the details from the last startRecovery call. */
  resendRecovery: () => Promise<RecoveryChallenge>;
  /** Exchanges the code for a session on this device. Throws with a user-facing message. */
  verifyRecovery: (challengeId: string, code: string) => Promise<User>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [isReady, setIsReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [recoverError, setRecoverError] = useState<RecoverError | null>(null);
  const lastRecoveryParams = useRef<{ phone?: string; nationalId?: string } | null>(null);
  const saveSession = useCallback(async (token: string | null, id: string | null) => {
    currentToken = token;
    await setStored(TOKEN_KEY, token);
    await setStored(USER_ID_KEY, id);
    setUserId(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [storedId, storedToken] = await Promise.all([
        getStored(USER_ID_KEY),
        getStored(TOKEN_KEY),
      ]);
      if (cancelled) return;
      if (storedId && storedToken) {
        currentToken = storedToken;
        setUserId(storedId);
      } else if (storedId) {
        // Installed before sessions existed: the user must recover their
        // account once to get a token.
        await setStored(USER_ID_KEY, null);
      }
      setIsReady(true);
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

  // The server no longer recognises this device's session.
  useEffect(() => {
    const status = errorStatus(userQuery.error);
    if (status === 401 || status === 403) {
      void saveSession(null, null);
      queryClient.clear();
    }
  }, [userQuery.error, saveSession, queryClient]);

  const registerMutation = useRegisterUser();

  const register = useCallback(
    async (input: RegisterUserInput): Promise<User> => {
      setRegisterError(null);
      try {
        const { token, user } = await registerMutation.mutateAsync({ data: input });
        queryClient.setQueryData([getGetUserUrl(user.id)], user);
        await saveSession(token, user.id);
        return user;
      } catch (err) {
        setRegisterError(errorMessage(err, "Registration failed. Please try again."));
        throw err;
      }
    },
    [registerMutation, saveSession, queryClient],
  );

  const signOut = useCallback(async () => {
    if (currentToken) {
      await logout().catch(() => {});
    }
    await saveSession(null, null);
    queryClient.clear();
  }, [saveSession, queryClient]);

  const startRecovery = useCallback(
    async (params: { phone?: string; nationalId?: string }): Promise<RecoveryChallenge> => {
      setRecoverError(null);
      setRecovering(true);
      lastRecoveryParams.current = params;
      try {
        return await startRecoveryRequest({
          phone: params.phone,
          nationalId: params.nationalId,
        });
      } catch (err) {
        setRecoverError({
          status: errorStatus(err),
          message: errorMessage(err, "Could not find your account"),
        });
        throw err;
      } finally {
        setRecovering(false);
      }
    },
    [],
  );

  const resendRecovery = useCallback(async (): Promise<RecoveryChallenge> => {
    if (!lastRecoveryParams.current) throw new Error("Start recovery again.");
    try {
      return await startRecoveryRequest(lastRecoveryParams.current);
    } catch (err) {
      throw new Error(errorMessage(err, "We couldn't send a new code. Please try again."));
    }
  }, []);

  const verifyRecovery = useCallback(
    async (challengeId: string, code: string): Promise<User> => {
      try {
        const { token, user } = await verifyRecoveryRequest({ challengeId, code });
        queryClient.setQueryData([getGetUserUrl(user.id)], user);
        await saveSession(token, user.id);
        return user;
      } catch (err) {
        throw new Error(errorMessage(err, "Couldn't verify your code. Please try again."));
      }
    },
    [saveSession, queryClient],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      isReady,
      userId,
      user: userQuery.data ?? null,
      isUserLoading: !!userId && userQuery.isLoading,
      registering: registerMutation.isPending,
      registerError,
      recovering,
      recoverError,
      register,
      startRecovery,
      resendRecovery,
      verifyRecovery,
      signOut,
    }),
    [
      isReady,
      userId,
      userQuery.data,
      userQuery.isLoading,
      registerMutation.isPending,
      registerError,
      recovering,
      recoverError,
      register,
      startRecovery,
      resendRecovery,
      verifyRecovery,
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
