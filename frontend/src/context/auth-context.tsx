"use client";

import * as React from "react";
import { apiFetch } from "@/lib/api";
import type { VendorStore } from "@/lib/vendor-store";
import {
  clearStoredSession,
  getStoredToken,
  getStoredUser,
  setStoredSession,
  type AuthUser,
} from "@/lib/auth-storage";

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  store: VendorStore;
  loading: boolean;
};

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  setSession: (
    token: string,
    user: AuthUser,
    store?: VendorStore
  ) => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

async function syncSessionCookie(token: string | null): Promise<void> {
  if (!token) {
    await fetch("/api/auth/session", { method: "DELETE" });
    return;
  }
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Session sync failed");
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>({
    user: null,
    token: null,
    store: null,
    loading: true,
  });

  const setSession = React.useCallback(
    async (token: string, user: AuthUser, store: VendorStore = null) => {
      setStoredSession(token, user);
      await syncSessionCookie(token);
      setState({ user, token, store, loading: false });
    },
    []
  );

  const logout = React.useCallback(async () => {
    clearStoredSession();
    await syncSessionCookie(null);
    setState({ user: null, token: null, store: null, loading: false });
  }, []);

  const refreshUser = React.useCallback(async () => {
    const token = getStoredToken();
    if (!token) return;
    const data = await apiFetch<{ user: AuthUser; store: VendorStore }>(
      "/api/auth/me",
      { token }
    );
    const user = data.user;
    setStoredSession(token, user);
    setState((s) => ({ ...s, user, store: data.store ?? null }));
  }, []);

  const login = React.useCallback(
    async (email: string, password: string) => {
      const data = await apiFetch<{
        token: string;
        user: AuthUser;
        store: VendorStore;
      }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      await setSession(data.token, data.user, data.store ?? null);
      return data.user;
    },
    [setSession]
  );

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = getStoredToken();
      const cached = getStoredUser();
      if (!token || !cached) {
        if (!cancelled) {
          setState({ user: null, token: null, store: null, loading: false });
        }
        return;
      }
      try {
        await syncSessionCookie(token);
        const data = await apiFetch<{ user: AuthUser; store: VendorStore }>(
          "/api/auth/me",
          { token }
        );
        if (!cancelled) {
          setStoredSession(token, data.user);
          setState({
            user: data.user,
            token,
            store: data.store ?? null,
            loading: false,
          });
        }
      } catch {
        clearStoredSession();
        await syncSessionCookie(null);
        if (!cancelled) {
          setState({ user: null, token: null, store: null, loading: false });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      logout,
      setSession,
      refreshUser,
    }),
    [state, login, logout, setSession, refreshUser]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export function useOptionalAuth(): AuthContextValue | null {
  return React.useContext(AuthContext);
}
