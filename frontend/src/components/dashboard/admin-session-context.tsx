"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export type AdminSessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
};

type Ctx = {
  user: AdminSessionUser | null;
  loading: boolean;
  refresh: () => Promise<boolean>;
  logout: () => Promise<void>;
};

const AdminSessionContext = React.createContext<Ctx | null>(null);

export function AdminSessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = React.useState<AdminSessionUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    const res = await fetch("/api/admin/me", { credentials: "include" });
    if (!res.ok) {
      setUser(null);
      return false;
    }
    const data = (await res.json()) as { user: AdminSessionUser };
    setUser(data.user);
    return true;
  }, []);

  const logout = React.useCallback(async () => {
    await fetch("/api/admin/session", { method: "DELETE", credentials: "include" });
    setUser(null);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await refresh();
      if (!cancelled && !ok) {
        const path =
          typeof window !== "undefined"
            ? window.location.pathname + window.location.search
            : "/admin";
        router.replace(`/admin-secure-login?next=${encodeURIComponent(path)}`);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh, router]);

  const value = React.useMemo(
    () => ({ user, loading, refresh, logout }),
    [user, loading, refresh, logout]
  );

  return (
    <AdminSessionContext.Provider value={value}>
      {children}
    </AdminSessionContext.Provider>
  );
}

export function useAdminSession() {
  const ctx = React.useContext(AdminSessionContext);
  if (!ctx) {
    throw new Error("useAdminSession must be used within AdminSessionProvider");
  }
  return ctx;
}

export function useOptionalAdminSession(): Ctx | null {
  return React.useContext(AdminSessionContext);
}
